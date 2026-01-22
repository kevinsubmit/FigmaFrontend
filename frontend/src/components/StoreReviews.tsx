import React, { useState, useEffect } from 'react';
import { Star, User as UserIcon, MessageCircle } from 'lucide-react';
import { getStoreReviews, getStoreRating, Review, StoreRating } from '../api/reviews';

interface StoreReviewsProps {
  storeId: number;
}

const StoreReviews: React.FC<StoreReviewsProps> = ({ storeId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState<StoreRating | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviewsAndRating();
  }, [storeId]);

  const loadReviewsAndRating = async () => {
    try {
      setLoading(true);
      const [reviewsData, ratingData] = await Promise.all([
        getStoreReviews(storeId, 0, 20),
        getStoreRating(storeId),
      ]);
      setReviews(reviewsData);
      setRating(ratingData);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={`${
              star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* Rating Summary */}
      {rating && (
        <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-[#D4AF37] mb-1">
                {rating.average_rating.toFixed(1)}
              </div>
              <div className="flex justify-center mb-1">
                {renderStars(Math.round(rating.average_rating))}
              </div>
              <div className="text-xs text-gray-400">
                {rating.total_reviews} {rating.total_reviews === 1 ? 'review' : 'reviews'}
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = rating.rating_distribution[star] || 0;
                const percentage = rating.total_reviews > 0 ? (count / rating.total_reviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400 w-8">{star} ★</span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <Star className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-400">No reviews yet</p>
          <p className="text-sm text-gray-500 mt-1">Be the first to review this salon!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Customer Reviews</h3>
            <p className="text-xs text-gray-500">Verified by completed appointments.</p>
          </div>
          {reviews.map((review) => (
            <div
              key={review.id}
              className="p-4 rounded-xl bg-white/5 border border-white/10"
            >
              {/* User Info */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                  {review.user_avatar ? (
                    <img
                      src={review.user_avatar}
                      alt={review.user_name || 'User'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon size={20} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">
                    {review.user_name || 'Anonymous'}
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStars(review.rating)}
                    <span className="text-xs text-gray-400">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comment */}
              {review.comment && (
                <p className="text-gray-300 text-sm leading-relaxed mb-3">{review.comment}</p>
              )}

              {/* Images */}
              {review.images && review.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {review.images.map((imageUrl, imgIndex) => (
                    <img
                      key={imgIndex}
                      src={`http://localhost:8000${imageUrl}`}
                      alt={`Review image ${imgIndex + 1}`}
                      className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(`http://localhost:8000${imageUrl}`, '_blank')}
                    />
                  ))}
                </div>
              )}

              {/* Admin Reply */}
              {review.reply && (
                <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border-l-4 border-blue-400">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle size={14} className="text-blue-400" />
                    <span className="text-xs font-semibold text-blue-400">
                      {review.reply.admin_name || 'Store Admin'} replied
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(review.reply.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">
                    {review.reply.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StoreReviews;
