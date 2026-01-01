import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Share, 
  MoreHorizontal, 
  ScanLine,
  X,
  Link,
  Instagram,
  Twitter,
  MessageSquare,
  Copy,
  Download
} from 'lucide-react';
import Masonry from 'react-responsive-masonry';
import { useState, useEffect } from 'react';
import { Loader } from './ui/Loader';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from './ui/sonner';
import { toast } from 'sonner@2.0.3';

interface PinDetailProps {
  onBack: () => void;
  onBookNow: () => void;
  pinData?: {
    id: number;
    url: string;
    title: string;
    author: string;
    likes: number;
    authorAvatar?: string;
  };
}

export function PinDetail({ onBack, onBookNow, pinData }: PinDetailProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // Mock data if no pinData provided
  const data = pinData || {
    id: 1,
    url: 'https://images.unsplash.com/photo-1754799670410-b282791342c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaW5rJTIwbmFpbHMlMjBtYW5pY3VyZXxlbnwxfHx8fDE3NjUxNjI2NDF8MA&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Pink Manicure with Hearts',
    author: 'Monica Zapata galvis',
    likes: 163,
  };

  const [likeCount, setLikeCount] = useState(data.likes);

  const toggleLike = () => {
    if (isLiked) {
      setLikeCount(prev => prev - 1);
    } else {
      setLikeCount(prev => prev + 1);
    }
    setIsLiked(!isLiked);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(data.url);
      toast.success("Link copied to clipboard");
    } catch (err) {
      // Fallback for environments where Clipboard API is blocked
      try {
        const textArea = document.createElement("textarea");
        textArea.value = data.url;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          toast.success("Link copied to clipboard");
        } else {
          toast.error("Failed to copy link");
        }
      } catch (fallbackErr) {
        toast.error("Failed to copy link");
      }
    }
  };

  const relatedImages = [
    {
      id: 101,
      url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&auto=format&fit=crop&q=60',
      title: 'Similar Pink Style'
    },
    {
      id: 102,
      url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&auto=format&fit=crop&q=60',
      title: 'Nail Art'
    },
    {
      id: 103,
      url: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800&auto=format&fit=crop&q=60',
      title: 'Manicure'
    },
    {
      id: 104,
      url: 'https://images.unsplash.com/photo-1519017713917-9807534d0b0b?w=800&auto=format&fit=crop&q=60',
      title: 'Glam Nails'
    }
  ];

  useEffect(() => {
    // Simulate loading detailed data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="fixed top-0 left-0 right-0 z-50 px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
           <button 
            onClick={onBack}
            className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
        </div>
        <div className="pt-20">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24 animate-in fade-in duration-500">
      <Toaster />
      {/* Sticky Top Bar for Back Button */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <button 
          onClick={onBack}
          className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center pointer-events-auto hover:bg-black/70 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className="flex flex-col">
        {/* Main Image Section */}
        <div className="relative w-full rounded-b-[2rem] overflow-hidden bg-gray-900">
          <img 
            src={data.url} 
            alt={data.title}
            className="w-full h-auto object-cover max-h-[75vh]"
          />
          
          {/* Visual Search Icon */}
          <button className="absolute bottom-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/70 transition-colors">
            <ScanLine className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Actions Bar */}
        <div className="px-4 py-4 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div 
                className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-transform active:scale-95" 
                onClick={toggleLike}
              >
                <Heart 
                  className={`w-7 h-7 transition-colors duration-300 ${isLiked ? 'fill-white text-white' : 'text-white'}`} 
                />
                <span className="text-sm font-semibold">{likeCount}</span>
              </div>
              <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80" onClick={() => setShowComments(!showComments)}>
                <MessageCircle className="w-6 h-6 text-white" />
                <span className="text-sm font-semibold">2</span>
              </div>
              <div className="cursor-pointer hover:opacity-80" onClick={() => setIsShareOpen(true)}>
                <Share className="w-6 h-6 text-white" />
              </div>
            </div>
            
            {/* Removed MoreHorizontal */}
          </div>
          
          <div className="flex items-center justify-center gap-4 w-full">
            <button 
              onClick={onBookNow}
              className="flex-1 bg-[#2a2a2a] hover:bg-[#333] text-white py-3.5 rounded-full font-bold text-base transition-colors border border-[#D4AF37]/30 whitespace-nowrap"
            >
              Book this look
            </button>
            <button className="flex-1 bg-[#D4AF37] hover:bg-[#b5952f] text-black py-3.5 rounded-full font-bold text-base transition-colors">
              Save
            </button>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="px-4 pb-6 animate-in slide-in-from-top-4 duration-300 border-t border-[#333] pt-4 mt-2">
             <h3 className="text-lg font-bold mb-4">Comments</h3>
             
             {/* Comment List */}
             <div className="space-y-4 mb-6">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    J
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Jessica Lee <span className="text-gray-500 font-normal ml-2">2h</span></p>
                    <p className="text-sm text-gray-300">Love this design! 😍</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    M
                  </div>
                  <div>
                     <p className="text-sm font-semibold text-white">Maria Garcia <span className="text-gray-500 font-normal ml-2">5h</span></p>
                     <p className="text-sm text-gray-300">Can I book this for next week?</p>
                  </div>
                </div>
             </div>

             {/* Comment Input */}
             <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                   <span className="text-xs text-white">You</span>
                </div>
                <div className="flex-1 relative">
                   <input 
                      type="text" 
                      placeholder="Add a comment..." 
                      className="w-full bg-[#1a1a1a] text-white text-sm rounded-full py-2.5 px-4 border border-[#333] focus:border-[#D4AF37] focus:outline-none transition-colors"
                   />
                   <button className="absolute right-2 top-1/2 -translate-y-1/2 text-[#D4AF37] text-sm font-bold px-2 hover:text-[#b5952f]">
                      Post
                   </button>
                </div>
             </div>
          </div>
        )}
        {/* Share Sheet Modal */}
        <AnimatePresence>
          {isShareOpen && (
            <>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsShareOpen(false)}
                className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-sm"
              />
              
              {/* Sheet */}
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-[#0f0f0f] rounded-t-3xl z-[61] overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-1">
                  <div className="w-12 h-1.5 bg-gray-700 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-4 py-2 flex items-center justify-between relative">
                  <button 
                    onClick={() => setIsShareOpen(false)}
                    className="p-2 -ml-2 text-white hover:text-gray-300 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <h2 className="text-lg font-bold absolute left-1/2 -translate-x-1/2">Share ND link</h2>
                  <div className="w-8" /> {/* Spacer for centering */}
                </div>

                {/* Content */}
                <div className="flex flex-col items-center px-4 pb-8 pt-2">
                  {/* Image Preview */}
                  <div className="relative w-[60%] aspect-[3/4] rounded-2xl overflow-hidden mb-8 shadow-2xl border border-gray-800">
                     <img 
                      src={data.url} 
                      alt={data.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Share Options */}
                  <div className="flex items-center justify-start gap-4 w-full overflow-x-auto px-2 pb-2 scrollbar-hide">
                    <button 
                      className="flex flex-col items-center gap-2 group min-w-[72px]"
                      onClick={handleCopyLink}
                    >
                      <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                        <Link className="w-7 h-7 text-white" />
                      </div>
                      <span className="text-xs text-gray-400">Copy link</span>
                    </button>
                    
                    <button className="flex flex-col items-center gap-2 group min-w-[72px]">
                      <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                        <Download className="w-7 h-7 text-white" />
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">Download image</span>
                    </button>

                    <button className="flex flex-col items-center gap-2 group min-w-[72px]">
                      <div className="w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center group-hover:opacity-90 transition-opacity">
                        <MessageCircle className="w-7 h-7 text-white fill-current" />
                      </div>
                      <span className="text-xs text-gray-400">WhatsApp</span>
                    </button>

                    <button className="flex flex-col items-center gap-2 group min-w-[72px]">
                      <div className="w-14 h-14 rounded-full bg-[#53d769] flex items-center justify-center group-hover:opacity-90 transition-opacity">
                         <MessageSquare className="w-7 h-7 text-white fill-current" />
                      </div>
                      <span className="text-xs text-gray-400">Messages</span>
                    </button>

                    <button className="flex flex-col items-center gap-2 group min-w-[72px]">
                      <div className="w-14 h-14 rounded-full bg-black border border-gray-700 flex items-center justify-center group-hover:bg-gray-900 transition-colors">
                         <Twitter className="w-6 h-6 text-white fill-current" />
                      </div>
                      <span className="text-xs text-gray-400">X</span>
                    </button>

                    <button className="flex flex-col items-center gap-2 group min-w-[72px]">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#833AB4] flex items-center justify-center group-hover:opacity-90 transition-opacity">
                         <Instagram className="w-7 h-7 text-white" />
                      </div>
                      <span className="text-xs text-gray-400">Instagram</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}