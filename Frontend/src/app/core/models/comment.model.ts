/** Comments on an issue (DTOs/CommentDTOs.cs). */
export interface Comment {
  commentId: number;
  issueId: number;
  userId: number;
  userName: string | null;
  content: string;
  isStaffComment: boolean;
  commentDate: string;
  /** Set by a page to flash a newly posted comment; never sent by the API. */
  highlighted?: boolean;
}
