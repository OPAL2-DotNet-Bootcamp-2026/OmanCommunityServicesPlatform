using Microsoft.EntityFrameworkCore;
using OmanCommunityServicesPlatform.Models;

namespace OmanCommunityServicesPlatform.Repositories
{
    public class CommentRepo
    {
        private readonly OCSPContext context;

        public CommentRepo(OCSPContext _context)
        {
            context = _context;
        }

        public List<Comment> GetByIssueId(int issueId)
        {
            return context.Comments
                .Include(comment => comment.user)
                .Where(comment => comment.issueId == issueId)
                .OrderBy(comment => comment.commentDate)
                .ToList();
        }

        public Comment? GetById(int commentId)
        {
            return context.Comments
                .Include(comment => comment.user)
                .FirstOrDefault(comment => comment.commentId == commentId);
        }

        public void Add(Comment comment)
        {
            context.Comments.Add(comment);
            context.SaveChanges();
        }

        public void Delete(Comment comment)
        {
            context.Comments.Remove(comment);
            context.SaveChanges();
        }
    }
}