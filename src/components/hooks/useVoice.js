export const useVoice = () => {
  const speak = (text) => {
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fil-PH';
    utterance.rate = 0.9;
    
    window.speechSynthesis.speak(utterance);
  };

  return { speak };
};