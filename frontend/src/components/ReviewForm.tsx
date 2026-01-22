import React, { useState, useEffect, useRef } from 'react';
import { Star, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { createReview, updateReview, Review, uploadImages } from '../api/reviews';

interface ReviewFormProps {
  appointmentId: number;
  onSuccess: () => void;
  onCancel: () => void;
  existingReview?: Review; // 用于编辑模式
}

const ReviewForm: React.FC<ReviewFormProps> = ({ appointmentId, onSuccess, onCancel, existingReview }) => {
  const [rating, setRating] = useState<number>(existingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>(existingReview?.comment || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>(existingReview?.images || []);
  const [isUploadingImages, setIsUploadingImages] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = !!existingReview;

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment || '');
      setImagePreviewUrls(existingReview.images || []);
    }
  }, [existingReview]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // 限制最多5张图片
    const totalImages = imagePreviewUrls.length + selectedImages.length + files.length;
    if (totalImages > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    
    // 验证文件类型和大小
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are allowed');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
    }
    
    setSelectedImages([...selectedImages, ...files]);
    
    // 生成预览URL
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    const isExistingImage = index < (existingReview?.images?.length || 0);
    
    if (isExistingImage) {
      // 移除现有图片
      setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
    } else {
      // 移除新选择的图片
      const newImageIndex = index - (existingReview?.images?.length || 0);
      setSelectedImages(prev => prev.filter((_, i) => i !== newImageIndex));
      setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast.error('Please login first');
        return;
      }

      // 上传新图片
      let uploadedImageUrls: string[] = [];
      if (selectedImages.length > 0) {
        setIsUploadingImages(true);
        try {
          uploadedImageUrls = await uploadImages(selectedImages, token);
        } catch (error: any) {
          console.error('Failed to upload images:', error);
          toast.error('Failed to upload images');
          setIsSubmitting(false);
          setIsUploadingImages(false);
          return;
        }
        setIsUploadingImages(false);
      }

      // 合并现有图片和新上传的图片
      const existingImageUrls = isEditMode 
        ? imagePreviewUrls.filter(url => url.startsWith('http') || url.startsWith('/uploads'))
        : [];
      const allImageUrls = [...existingImageUrls, ...uploadedImageUrls];

      if (isEditMode && existingReview) {
        // 编辑模式
        await updateReview(
          existingReview.id,
          {
            appointment_id: appointmentId,
            rating,
            comment: comment.trim() || undefined,
            images: allImageUrls.length > 0 ? allImageUrls : undefined,
          },
          token
        );
        toast.success('Review updated successfully!');
      } else {
        // 创建模式
        await createReview(
          {
            appointment_id: appointmentId,
            rating,
            comment: comment.trim() || undefined,
            images: allImageUrls.length > 0 ? allImageUrls : undefined,
          },
          token
        );
        toast.success('Review submitted successfully!');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Failed to submit review:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to submit review';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] rounded-2xl shadow-2xl max-w-md w-full p-6 border border-white/10 text-white">
        <h2 className="text-2xl font-bold text-white mb-3">
          {isEditMode ? 'Edit Review' : 'Write a Review'}
        </h2>
        <p className="text-xs text-gray-400 mb-6">
          Reviews are available within 30 days after your appointment.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Rating Stars */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-200 mb-3">
              Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="rounded-full p-1 transition-transform hover:scale-110 hover:bg-white/5"
                >
                  <Star
                    size={44}
                    className={`${
                      star <= (hoverRating || rating)
                        ? 'fill-[#D4AF37] text-[#D4AF37] drop-shadow-[0_0_6px_rgba(212,175,55,0.35)]'
                        : 'text-gray-600'
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-400 mt-2">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label htmlFor="comment" className="block text-sm font-medium text-gray-200 mb-2">
              Comment (Optional)
            </label>
            <textarea
              id="comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              className="w-full px-4 py-2 bg-[#151515] border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#D4AF37]/60 focus:border-transparent resize-none"
              maxLength={500}
            />
            <p className="text-sm text-gray-500 mt-1 text-right">
              {comment.length}/500
            </p>
          </div>

          {/* Images */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Photos (Optional, max 5)
            </label>
            
            {/* Image Previews */}
            {imagePreviewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {imagePreviewUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={url.startsWith('http') || url.startsWith('/') ? `http://localhost:8000${url}` : url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-black transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Upload Button */}
            {imagePreviewUrls.length < 5 && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImages}
                  className="w-full py-3 border-2 border-dashed border-white/20 rounded-lg hover:border-[#D4AF37]/70 transition-colors flex items-center justify-center gap-2 text-gray-300 hover:text-[#D4AF37] disabled:opacity-50"
                >
                  {isUploadingImages ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      <span>Add Photos</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#c49b2f] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (isEditMode ? 'Updating...' : 'Submitting...') : (isEditMode ? 'Update Review' : 'Submit Review')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewForm;
