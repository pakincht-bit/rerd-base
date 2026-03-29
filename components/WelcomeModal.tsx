import React, { useState } from 'react';
import { X } from 'lucide-react';

interface WelcomeModalProps {
    onClose: () => void;
}

const slides = [
    {
        title: "A Fresh, Premium Look",
        description: "The overall UI has changed! Enjoy a cleaner, brighter interface with refined colors, modern typography, and a new airy layout.",
        image: "/new_Overview.jpg"
    },
    {
        title: "Floating Filter Container",
        description: "We moved the filter container from the sidebar to the middle as a floating container for better accessibility and more map space.",
        image: "/new_New%20floating.jpg"
    },
    {
        title: "New Developer Filter",
        description: "You can now easily filter properties by the developer's name to find exactly what you're looking for.",
        image: "/new_Developer.jpg"
    },
    {
        title: "New Filter Tools & Ruler",
        description: "Press R to activate the map distance ruler tool to easily measure distances between points on the map!",
        image: "/new_Ruler.jpg"
    },
    {
        title: "Feedback & Changelog",
        description: "Let's talk with the developer or me! haha. Submit feature ideas directly and track updates in our new Changelog hub.",
        image: "/new_community.jpg"
    }
];

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    return (
        <div className="fixed inset-0 z-[400] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[24px] shadow-[0_32px_80px_-12px_rgba(0,0,0,0.15)] w-full max-w-[600px] overflow-hidden animate-in zoom-in-95 duration-300 relative flex flex-col">
                
                {/* Close Button */}
                <button 
                    onClick={onClose} 
                    className="absolute top-6 right-6 p-2 bg-white text-gray-500 hover:text-gray-900 rounded-full transition-all shadow-md hover:shadow-lg border border-gray-100 z-[100]"
                    aria-label="Close"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="w-full aspect-video bg-gray-50 relative border-b border-gray-100/50">
                    {slides.map((slide, idx) => (
                        <img 
                            key={idx}
                            src={slide.image} 
                            alt={slide.title} 
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                        />
                    ))}
                </div>

                <div className="p-8 pt-8 flex flex-col items-center text-center">
                    <h2 className="text-[22px] font-display font-bold text-gray-900 mb-3 tracking-tight">
                        {slides[currentSlide].title}
                    </h2>
                    <p className="text-gray-500 text-[14px] leading-relaxed mb-8 max-w-sm min-h-[60px]">
                        {slides[currentSlide].description}
                    </p>

                    {/* Pagination Dots */}
                    <div className="flex gap-2 mb-10">
                        {slides.map((_, idx) => (
                            <button 
                                key={idx}
                                onClick={() => setCurrentSlide(idx)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-5 bg-scbx' : 'w-1.5 bg-gray-200 hover:bg-gray-300'}`}
                                aria-label={`Go to slide ${idx + 1}`}
                            />
                        ))}
                    </div>

                    {/* Buttons */}
                    <div className="flex w-full gap-3">
                        {currentSlide > 0 && (
                            <button
                                onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                                className="flex-1 py-3.5 rounded-xl font-display font-medium text-[14px] transition-all border bg-transparent border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (currentSlide === slides.length - 1) {
                                    onClose();
                                } else {
                                    setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1));
                                }
                            }}
                            className="flex-1 py-3.5 rounded-xl bg-scbx hover:bg-scbxHover text-white font-display font-medium transition-all text-[14px] shadow-[inset_0_1px_8px_rgba(255,255,255,0.2),inset_0_-1px_4px_rgba(0,0,0,0.15)] flex items-center justify-center gap-2"
                        >
                            {currentSlide === slides.length - 1 ? "Finish" : "Next"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;
