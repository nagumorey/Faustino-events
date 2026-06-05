import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { X, Mic, Volume2, Keyboard, Upload, Image as ImageIcon, Trash2, Star, Plus } from 'lucide-react';

const AdminEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [focusedElement, setFocusedElement] = useState("");
  const [voiceFeedback, setVoiceFeedback] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventImages, setEventImages] = useState([]);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    event_name: '',
    venue: '',
    amount_per_pax: '',
    event_status: 'Available',
    event_description: '',
  });

  const supabaseUrl = 'https://ekqixbskebdsjftlprwm.supabase.co';

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setVoiceFeedback(text);
    setTimeout(() => setVoiceFeedback(""), 2000);
  };

  const readFocusedElement = () => {
    const activeElement = document.activeElement;
    let textToRead = "";

    if (activeElement) {
      if (activeElement.classList.contains("mic-btn")) {
        textToRead = "Microphone button. Press Enter to activate voice commands.";
      }
      else if (activeElement.classList.contains("back-btn")) {
        textToRead = "Back to Dashboard button. Press Enter to go back.";
      }
      else if (activeElement.classList.contains("add-btn")) {
        textToRead = "Add New Package button. Press Enter to open form.";
      }
      else if (activeElement.classList.contains("edit-btn")) {
        const eventName = activeElement.getAttribute("data-event-name");
        textToRead = `Edit ${eventName} button. Press Enter to edit this event.`;
      }
      else if (activeElement.classList.contains("manage-link")) {
        const eventName = activeElement.getAttribute("data-event-name");
        textToRead = `Manage ${eventName} button. Press Enter to manage this event.`;
      }
      else if (activeElement.classList.contains("close-modal-btn")) {
        textToRead = "Close button. Press Enter to close the form.";
      }
      else if (activeElement.classList.contains("package-card")) {
        const name = activeElement.querySelector(".event-name")?.innerText;
        const status = activeElement.querySelector(".event-status")?.innerText;
        textToRead = `${name}, status ${status}. Press Tab to navigate options.`;
      }
      else if (activeElement.classList.contains("submit-btn")) {
        textToRead = "Save Package button. Press Enter to create new package.";
      }
      else if (activeElement.classList.contains("upload-btn")) {
        textToRead = "Upload Images button. Press Enter to select images.";
      }
      else if (activeElement.tagName === "INPUT") {
        const label = activeElement.getAttribute("placeholder") || activeElement.getAttribute("name");
        const value = activeElement.value;
        textToRead = `${label} input field. Current value: ${value || "empty"}`;
      }
      else if (activeElement.tagName === "SELECT") {
        const label = activeElement.getAttribute("name");
        const value = activeElement.value;
        textToRead = `${label} selection. Current value: ${value}`;
      }
      else if (activeElement.tagName === "TEXTAREA") {
        const label = activeElement.getAttribute("placeholder");
        textToRead = `${label} text area`;
      }
      
      if (textToRead) {
        speak(textToRead);
        setFocusedElement(textToRead);
        setTimeout(() => setFocusedElement(""), 2000);
      }
    }
  };

  const uploadImages = async (files) => {
    if (!files || files.length === 0) return [];
    
    setUploading(true);
    const uploadedUrls = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${i}.${fileExt}`;
        const filePath = `events/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/event-images/${filePath}`;
        uploadedUrls.push(publicUrl);
      }
      
      setUploading(false);
      return uploadedUrls;
    } catch (error) {
      console.error("Upload error:", error);
      speak("Image upload failed");
      setUploading(false);
      return [];
    }
  };

  const fetchEventImages = async (eventId) => {
    if (!eventId) return;
    
    const { data, error } = await supabase
      .from('event_images')
      .select('*')
      .eq('event_id', eventId)
      .order('display_order', { ascending: true });
    
    if (!error && data) {
      setEventImages(data);
      return data;
    }
    return [];
  };

  const saveEventImages = async (eventId, imageUrls, isFirstBatch = true) => {
    if (!eventId || imageUrls.length === 0) return;
    
    const imagesToInsert = imageUrls.map((url, index) => ({
      event_id: eventId,
      image_url: url,
      is_cover: isFirstBatch && index === 0,
      display_order: index
    }));
    
    const { error } = await supabase
      .from('event_images')
      .insert(imagesToInsert);
    
    if (error) {
      console.error("Error saving images:", error);
    }
  };

  const deleteImage = async (imageId) => {
    const { error } = await supabase
      .from('event_images')
      .delete()
      .eq('image_id', imageId);
    
    if (error) {
      console.error("Error deleting image:", error);
      alert("Failed to delete image");
    } else {
      if (editingEvent) {
        await fetchEventImages(editingEvent.event_id);
      }
      speak("Image deleted");
    }
  };

  const setAsCover = async (imageId) => {
    if (!editingEvent) return;
    
    await supabase
      .from('event_images')
      .update({ is_cover: false })
      .eq('event_id', editingEvent.event_id);
    
    const { error } = await supabase
      .from('event_images')
      .update({ is_cover: true })
      .eq('image_id', imageId);
    
    if (!error) {
      await fetchEventImages(editingEvent.event_id);
      speak("Cover image updated");
    }
  };

  const executeCommand = (command) => {
    console.log("Command:", command);

    if (command === "mic" || command === "microphone") {
      startVoice();
    }
    else if (command === "add" || command === "add package") {
      setIsModalOpen(true);
      speak("Add new package form opened");
    }
    else if (command === "close" || command === "close modal") {
      if (isModalOpen) {
        setIsModalOpen(false);
        setEditingEvent(null);
        setEventImages([]);
        setFormData({
          event_name: '',
          venue: '',
          amount_per_pax: '',
          event_status: 'Available',
          event_description: '',
        });
        speak("Form closed");
      }
    }
    else if (command === "back" || command === "dashboard") {
      speak("Going back to dashboard");
      setTimeout(() => {
        window.location.href = "/AdminDashboard";
      }, 500);
    }
    else if (command === "help") {
      speak("Commands: mic, add package, close, back dashboard, help");
    }
  };

  const startVoice = () => {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
      speak("Voice off");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      speak("Listening");
    };

    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript.toLowerCase().trim();
      executeCommand(command);
      recognition.stop();
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.log("Error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Tab") {
        setTimeout(() => readFocusedElement(), 100);
      }
      else if (e.key === "Enter") {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.click) {
          activeElement.click();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    
    const allInteractive = document.querySelectorAll("button, a, input, select, textarea, [tabindex]");
    allInteractive.forEach(el => {
      el.addEventListener("focus", readFocusedElement);
    });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      allInteractive.forEach(el => {
        el.removeEventListener("focus", readFocusedElement);
      });
    };
  }, [isModalOpen, events]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_id', { ascending: true });

      if (error) {
        console.error(error.message);
      } else {
        const eventsWithCover = await Promise.all((data || []).map(async (event) => {
          const { data: coverData } = await supabase
            .from('event_images')
            .select('image_url')
            .eq('event_id', event.event_id)
            .eq('is_cover', true)
            .single();
          
          return {
            ...event,
            cover_image: coverData?.image_url || null
          };
        }));
        setEvents(eventsWithCover || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    speak("Admin Events page loaded. Press Tab to navigate, or say help for commands.");
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const uploadedUrls = await uploadImages(files);
      if (uploadedUrls.length > 0 && editingEvent) {
        const isFirstBatch = eventImages.length === 0;
        await saveEventImages(editingEvent.event_id, uploadedUrls, isFirstBatch);
        await fetchEventImages(editingEvent.event_id);
      } else if (uploadedUrls.length > 0) {
        window.tempImages = window.tempImages || [];
        window.tempImages.push(...uploadedUrls);
      }
      speak(`${uploadedUrls.length} images uploaded`);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEdit = async (event) => {
    setEditingEvent(event);
    setFormData({
      event_name: event.event_name || '',
      venue: event.venue || '',
      amount_per_pax: event.amount_per_pax || '',
      event_status: event.event_status || 'Available',
      event_description: event.event_description || '',
    });
    await fetchEventImages(event.event_id);
    setIsModalOpen(true);
    speak(`Editing ${event.event_name}`);
  };

  const getCoverImage = (event) => {
    if (event.cover_image) return event.cover_image;
    return null;
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    speak("Updating package");
    setUploading(true);
    
    try {
      const updateData = {
        event_name: formData.event_name,
        venue: formData.venue,
        amount_per_pax: parseFloat(formData.amount_per_pax) || 0,
        event_status: formData.event_status,
        event_description: formData.event_description,
      };
      
      const { error } = await supabase
        .from('events')
        .update(updateData)
        .eq('event_id', editingEvent.event_id);

      if (error) throw error;

      if (window.tempImages && window.tempImages.length > 0) {
        const isFirstBatch = eventImages.length === 0;
        await saveEventImages(editingEvent.event_id, window.tempImages, isFirstBatch);
        window.tempImages = [];
      }

      speak("Package updated successfully");
      alert('Event Package Updated Successfully!');
      setIsModalOpen(false);
      setEditingEvent(null);
      setEventImages([]);
      setFormData({
        event_name: '',
        venue: '',
        amount_per_pax: '',
        event_status: 'Available',
        event_description: '',
      });
      await fetchEvents();
    } catch (err) {
      console.error("Update error:", err);
      speak("Error updating package");
      alert('Error updating package: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingEvent) {
      await handleUpdate(e);
      return;
    }
    
    speak("Creating new package");
    setUploading(true);
    
    try {
      const insertData = {
        event_name: formData.event_name,
        venue: formData.venue,
        amount_per_pax: parseFloat(formData.amount_per_pax) || 0,
        event_status: formData.event_status,
        event_description: formData.event_description,
      };
      
      const { data, error } = await supabase
        .from('events')
        .insert([insertData])
        .select();

      if (error) throw error;

      const newEventId = data[0].event_id;

      if (window.tempImages && window.tempImages.length > 0) {
        await saveEventImages(newEventId, window.tempImages, true);
        window.tempImages = [];
      }

      speak("Package created successfully");
      alert('Event Package Created Successfully!');
      setIsModalOpen(false);
      setFormData({
        event_name: '',
        venue: '',
        amount_per_pax: '',
        event_status: 'Available',
        event_description: '',
      });
      await fetchEvents();
    } catch (err) {
      console.error("Insert error:", err);
      speak("Error creating package");
      alert('Error inserting package: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
      <div className="text-xs font-black tracking-widest uppercase animate-pulse text-yellow-500">
        Loading Faustino's Packages...
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] font-sans">
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-yellow-500 to-yellow-400 bg-clip-text text-transparent">Event Packages</h1>
          
          <div className="flex gap-3">
            <button 
              onClick={startVoice}
              className="mic-btn px-3 py-2 bg-white/10 backdrop-blur-sm text-yellow-500 rounded-lg hover:bg-yellow-500 hover:text-black transition-all border border-white/20"
              tabIndex={0}
              aria-label="Microphone button"
            >
              <Mic size={16} />
            </button>

            <Link 
              to="/AdminDashboard" 
              className="back-btn px-4 py-2 bg-yellow-500 text-black text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20"
              tabIndex={0}
              aria-label="Back to Dashboard button"
            >
              Back to Dashboard
            </Link>
            <button 
              onClick={() => {
                setIsModalOpen(true);
                window.tempImages = [];
              }}
              className="add-btn bg-yellow-500 text-black px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20"
              tabIndex={0}
              aria-label="Add New Package button"
            >
              Add New Package
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.length > 0 ? (
            events.map((e) => (
              <div key={e.event_id} className="package-card bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden hover:shadow-xl hover:border-yellow-500/50 transition-all">
                <div className="relative h-48 overflow-hidden bg-white/5">
                  {getCoverImage(e) ? (
                    <img 
                      src={getCoverImage(e)} 
                      alt={e.event_name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10">
                      <ImageIcon size={48} className="text-gray-500" />
                    </div>
                  )}
                  <button
                    onClick={() => handleEdit(e)}
                    className="edit-btn absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white p-1.5 rounded-lg hover:bg-yellow-500 hover:text-black transition-all"
                    data-event-name={e.event_name}
                    tabIndex={0}
                    aria-label={`Edit ${e.event_name}`}
                  >
                    ✏️
                  </button>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`event-status px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                      e.event_status === 'Available' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {e.event_status || 'Unavailable'}
                    </span>
                  </div>
                  
                  <h3 className="event-name text-xl font-bold text-white mb-1">{e.event_name}</h3>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
                    {e.venue || 'No Venue Set'}
                  </p>
                  <p className="text-xs text-gray-400 mb-4 line-clamp-2">
                    {e.event_description || 'No description'}
                  </p>
                  
                  <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Price per Pax</p>
                      <p className="text-lg font-black text-yellow-500">₱{parseFloat(e.amount_per_pax || 0).toLocaleString()}</p>
                    </div>
                    <Link 
                      to={`/ManageEvent/${e.event_id}`} 
                      className="manage-link text-[10px] font-black uppercase text-yellow-500 hover:text-yellow-400 hover:underline"
                      data-event-name={e.event_name}
                      tabIndex={0}
                      aria-label={`Manage ${e.event_name}`}
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full p-20 text-center bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">No events in database</p>
            </div>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-[#1a1a2e]/90 backdrop-blur-xl max-w-2xl w-full rounded-2xl p-8 border border-yellow-500/30 shadow-2xl relative my-8">
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingEvent(null);
                  setEventImages([]);
                  window.tempImages = [];
                  setFormData({
                    event_name: '',
                    venue: '',
                    amount_per_pax: '',
                    event_status: 'Available',
                    event_description: '',
                  });
                }}
                className="close-modal-btn absolute right-6 top-6 text-gray-400 hover:text-yellow-500 transition-colors"
                tabIndex={0}
                aria-label="Close modal button"
              >
                <X size={20} />
              </button>

              <div className="mb-6">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                  {editingEvent ? 'Edit Package' : 'Create New Package'}
                </h2>
                <div className="h-1 w-12 bg-yellow-500 mt-2"></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-2 block">Package Name</label>
                  <input 
                    type="text"
                    name="event_name"
                    required
                    value={formData.event_name}
                    onChange={handleInputChange}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-gray-500 outline-none focus:border-yellow-500 transition-all"
                    placeholder="e.g., Baptismal Package"
                    tabIndex={0}
                    aria-label="Package name input"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-2 block">Venue Location</label>
                  <input 
                    type="text"
                    name="venue"
                    required
                    value={formData.venue}
                    onChange={handleInputChange}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-gray-500 outline-none focus:border-yellow-500 transition-all"
                    placeholder="e.g., Manila Hotel Garden"
                    tabIndex={0}
                    aria-label="Venue location input"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-2 block">Price Per Pax (₱)</label>
                  <input 
                    type="number"
                    name="amount_per_pax"
                    required
                    value={formData.amount_per_pax}
                    onChange={handleInputChange}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-gray-500 outline-none focus:border-yellow-500 transition-all"
                    placeholder="0.00"
                    tabIndex={0}
                    aria-label="Price per pax input"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-2 block">Description</label>
                  <textarea 
                    name="event_description"
                    rows="3"
                    value={formData.event_description}
                    onChange={handleInputChange}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-gray-500 outline-none focus:border-yellow-500 transition-all resize-none"
                    placeholder="Describe the event package..."
                    tabIndex={0}
                    aria-label="Event description text area"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-2 block">Event Images (Multiple)</label>
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    multiple
                    className="hidden"
                    tabIndex={0}
                    aria-label="Upload multiple images"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="upload-btn w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-yellow-500 transition-all flex items-center justify-center gap-2 hover:bg-white/20"
                    tabIndex={0}
                    aria-label="Upload Images button"
                    disabled={uploading}
                  >
                    <Upload size={16} />
                    {uploading ? "Uploading..." : "Click to Upload Multiple Images"}
                  </button>
                  
                  {(editingEvent ? eventImages.length > 0 : window.tempImages?.length > 0) && (
                    <div className="mt-4">
                      <p className="text-[10px] font-bold text-gray-400 mb-2">Image Gallery</p>
                      <div className="flex flex-wrap gap-2">
                        {(editingEvent ? eventImages : (window.tempImages || []).map((url, idx) => ({ image_url: url, is_cover: idx === 0, image_id: `temp_${idx}` }))).map((img, idx) => (
                          <div key={img.image_id || idx} className="relative group">
                            <img 
                              src={img.image_url} 
                              alt={`Event ${idx + 1}`} 
                              className="w-20 h-20 object-cover rounded-lg border-2 border-white/20"
                            />
                            {img.is_cover && (
                              <div className="absolute -top-2 -right-2 bg-yellow-500 text-black rounded-full p-1">
                                <Star size={10} />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                              {!img.is_cover && editingEvent && (
                                <button
                                  type="button"
                                  onClick={() => setAsCover(img.image_id)}
                                  className="bg-yellow-500 text-black p-1 rounded"
                                  title="Set as cover"
                                >
                                  <Star size={12} />
                                </button>
                              )}
                              {editingEvent && (
                                <button
                                  type="button"
                                  onClick={() => deleteImage(img.image_id)}
                                  className="bg-red-500 text-white p-1 rounded"
                                  title="Delete image"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[8px] text-gray-500 mt-2">* The FIRST image uploaded automatically becomes the COVER PHOTO</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-2 block">Availability Status</label>
                  <select
                    name="event_status"
                    value={formData.event_status}
                    onChange={handleInputChange}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-yellow-500 transition-all"
                    tabIndex={0}
                    aria-label="Availability status selection"
                  >
                    <option value="Available" className="bg-[#1a1a2e]">Available</option>
                    <option value="Unavailable" className="bg-[#1a1a2e]">Unavailable</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  disabled={uploading}
                  className="submit-btn w-full bg-yellow-500 text-black py-4 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20 mt-4 disabled:opacity-50"
                  tabIndex={0}
                  aria-label="Save Package button"
                >
                  {uploading ? "Uploading Images..." : (editingEvent ? "Update Package" : "Save Package")}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEvents;