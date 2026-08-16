using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Repositories;

namespace OmanCommunityServicesPlatform.Services
{
    public class CommentService
    {
        private readonly CommentRepo commentRepo;
        private readonly IssueRepo issueRepo;
        private readonly ILogger<CommentService> logger;

        public CommentService(CommentRepo _commentRepo, IssueRepo _issueRepo, ILogger<CommentService> _logger)
        {
            commentRepo = _commentRepo;
            issueRepo = _issueRepo;
            logger = _logger;
        }

        // userId and isStaff both come from the Controller, extracted from the JWT —
        // never from the client-submitted DTO.
        public CommentResponseDto? Create(CreateCommentDto dto, int userId, bool isStaff)
        {
            Issue? issue = issueRepo.GetById(dto.issueId);
            if (issue == null)
            {
                logger.LogWarning("Comment creation failed: issue {IssueId} not found", dto.issueId);
                return null;
            }

            Comment comment = new Comment
            {
                issueId = dto.issueId,
                userId = userId,
                content = dto.content,
                isStaffComment = isStaff,
                commentDate = DateTime.UtcNow
            };

            commentRepo.Add(comment);
            logger.LogInformation("Comment {CommentId} added to issue {IssueId} by user {UserId} (Staff: {IsStaff})", comment.commentId, comment.issueId, comment.userId, comment.isStaffComment);

            return MapToDto(comment);
        }

        public List<CommentResponseDto> GetByIssueId(int issueId)
        {
            List<Comment> comments = commentRepo.GetByIssueId(issueId);
            return comments.Select(MapToDto).ToList();
        }

        // Only the comment's author can delete their own comment
        public bool Delete(int commentId, int userId)
        {
            Comment? comment = commentRepo.GetById(commentId);

            if (comment == null || comment.userId != userId)
            {
                logger.LogWarning("Comment deletion failed: comment {CommentId} not found or user {UserId} is not the author", commentId, userId);
                return false;
            }

            commentRepo.Delete(comment);
            logger.LogInformation("Comment {CommentId} on issue {IssueId} deleted by user {UserId}", commentId, comment.issueId, userId);
            return true;
        }

        private CommentResponseDto MapToDto(Comment comment)
        {
            return new CommentResponseDto
            {
                commentId = comment.commentId,
                issueId = comment.issueId,
                userId = comment.userId,
                userName = comment.user?.fullName,
                content = comment.content,
                isStaffComment = comment.isStaffComment,
                commentDate = comment.commentDate
            };
        }
    }
}