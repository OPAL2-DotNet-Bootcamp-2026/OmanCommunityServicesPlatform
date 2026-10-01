/** A citizen's rating of how a resolved issue was handled (DTOs/RatingDTOs.cs). */
export interface Rating {
  ratingId: number;
  issueId: number;
  userId: number;
  score: number;
  feedback: string | null;
  ratedAt: string;
}
