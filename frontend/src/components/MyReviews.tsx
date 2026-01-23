import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Edit2, Trash2, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'react-toastify';
import { getMyReviews, deleteReview, Review } from '../api/reviews';
import { getStoreById, Store } from '../api/stores';
import ReviewForm from './ReviewForm';

interface ReviewWithStore extends Review {
  store?: Store;
}

export function MyReviews() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ReviewWithStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast.error('Please login first');
        return;
      }

      const data = await getMyReviews(token);
      
      // Load store details for each review
      const reviewsWithStores = await Promise.all(
        data.map(async (review) => {
          try {
            const store = await getStoreById(review.store_id);
            return { ...review, store };
          } catch (error) {
            console.error('Failed to load store details:', error);
            return review;
          }
        })
      );
      
      setReviews(reviewsWithStores);
    } catch (error) {
      console.error('Failed to load reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reviewId: number) => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      setDeletingReviewId(reviewId);
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast.error('Please login first');
        return;
      }

      await deleteReview(reviewId, token);
      toast.success('Review deleted successfully');
      await loadReviews();
    } catch (error: any) {
      console.error('Failed to delete review:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete review');
    } finally {
      setDeletingReviewId(null);
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

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-[#333]">
        <button
          onClick={() => navigate('/profile')}
          className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-lg font-bold">My Reviews</h1>
        <div className="w-8" />
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-400 mb-2">No reviews yet</p>
            <p className="text-sm text-gray-500">
              Complete an appointment and share your experience!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="p-4 rounded-2xl bg-white/5 border border-white/10"
              >
                {/* Store Info */}
                {review.store && (
                  <div className="mb-3">
                    <h3 className="font-semibold text-lg text-white">
                      {review.store.name}
                    </h3>
                    <p className="text-sm text-gray-400">{review.store.address}</p>
                  </div>
                )}

                {/* Rating and Date */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {renderStars(review.rating)}
                    <span className="text-sm text-gray-400">
                      {review.rating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(review.created_at)}
                  </span>
                </div>

                {/* Comment */}
                {review.comment && (
                  <p className="text-gray-300 text-sm leading-relaxed mb-4">
                    {review.comment}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-white/10">
                  <button
                    onClick={() => {
                      setEditingReview(review);
                      setShowEditForm(true);
                    }}
                    className="flex-1 py-2 px-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(review.id)}
                    disabled={deletingReviewId === review.id}
                    className="flex-1 py-2 px-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {deletingReviewId === review.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Review Form */}
      {showEditForm && editingReview && (
        <ReviewForm
          appointmentId={editingReview.appointment_id}
          existingReview={editingReview}
          onSuccess={() => {
            setShowEditForm(false);
            setEditingReview(null);
            loadReviews();
          }}
          onCancel={() => {
            setShowEditForm(false);
            setEditingReview(null);
          }}
        />
      )}
    </div>
  );
}
