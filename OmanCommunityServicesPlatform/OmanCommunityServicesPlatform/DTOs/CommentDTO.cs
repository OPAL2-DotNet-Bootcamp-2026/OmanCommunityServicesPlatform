using System.ComponentModel.DataAnnotations;

namespace OmanCommunityServicesPlatform.DTOs
{
    // Used when a citizen or staff member adds a comment to an issue.
    // userId and isStaffComment are never accepted from the client —
    // both come from the authenticated caller's JWT (rule #5).
    public class CreateCommentDto
    {
        [Required]
        public int issueId { get; set; }

        [Required]
        [StringLength(1000, ErrorMessage = "Comment cannot exceed 1000 characters.")]
        public string content { get; set; } = string.Empty;
    }

    // Used when returning comment data to the client.
    public class CommentResponseDto
    {
        public int commentId { get; set; }
        public int issueId { get; set; }
        public int userId { get; set; }
        public string? userName { get; set; }
        public string content { get; set; } = string.Empty;
        public bool isStaffComment { get; set; }
        public DateTime commentDate { get; set; }
    }
}