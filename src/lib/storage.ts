import type { Review } from "../types/model";

const STORAGE_KEY = 'vibecheck_review';

export function loadReview(): Review | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as Review;
  } catch (error) {
    console.error('Failed to load review from localStorage:', error);
    return null;
  }
}

export function saveReview(review: Review): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(review));
  } catch (error) {
    console.error('Failed to save review to localStorage:', error);
  }
}

export function clearReview(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear review from localStorage:', error);
  }
}
