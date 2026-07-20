using Microsoft.EntityFrameworkCore;
using OmanCommunityServicesPlatform.Models;

namespace OmanCommunityServicesPlatform.Repositories
{
    public class IssueRepo
    {
        private OCSPContext context;
        public IssueRepo(OCSPContext context) 
        { 
            this.context = context;
        }
        public List<Issue> GetAll()
        {
            return context.Issues.ToList();
        }
        public Issue GetById(int issueId)
        {
            return context.Issues.FirstOrDefault(i => i.issueId == issueId);
        }
        public Issue GetWithDetails(int issueId)
        {
            return context.Issues
                .Include(i => i.reportedBy)
                .Include(i => i.category)
                .Include(i => i.region)
                .Include(i => i.assignedDepartment)
                .Include(i => i.comments)
                .Include(i => i.statusUpdates)
                .FirstOrDefault(i => i.issueId == issueId);
        }
        public void Add(Issue issue)
        {
            context.Issues.Add(issue);
            context.SaveChanges();
        }
        public void Delete(Issue issue)
        {
            context.Issues.Remove(issue);
            context.SaveChanges();
        }
    }
}
