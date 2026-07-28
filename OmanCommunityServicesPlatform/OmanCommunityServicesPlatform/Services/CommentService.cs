using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Repositories;

namespace OmanCommunityServicesPlatform.Services
{
    public class CommentService
    {
        private readonly CommentRepo commentRepo;
        private readonly IssueRepo issueRepo;
        private readonly UserRepo userRepo;

        public CommentService(CommentRepo _commentRepo, IssueRepo _issueRepo, UserRepo _userRepo)
        {
            commentRepo = _commentRepo;
            issueRepo = _issueRepo;
            this.userRepo = _userRepo;
        }

        // userId and isStaff both come from the Controller, extracted from the JWT —
        // never from the client-submitted DTO.
        public CommentResponseDto? Create(CreateCommentDto dto, int userId, bool isStaff)
        {
            Issue? issue = issueRepo.GetById(dto.issueId);
            if (issue == null)
            {
                return null;
            }

            User? user = userRepo.GetById(userId);
            if (user == null)
            {
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

            return new CommentResponseDto
            {
                commentId = comment.commentId,
                issueId = comment.issueId,
                userId = comment.userId,
                userName = user.fullName,
                content = comment.content,
                isStaffComment = comment.isStaffComment,
                commentDate = comment.commentDate
            };
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
                return false;
            }

            commentRepo.Delete(comment);
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