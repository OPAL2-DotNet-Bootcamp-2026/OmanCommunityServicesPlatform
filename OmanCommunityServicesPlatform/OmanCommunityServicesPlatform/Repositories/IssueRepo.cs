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
        // Get all issues
        public List<Issue> GetAll()
        {
            return context.Issues
                .Include(i => i.category)
                .Include(i => i.region)
                .Include(i => i.assignedDepartment)
                .ToList();
        }
        // Get one issue by ID
        public Issue? GetById(int issueId)
        {
            return context.Issues
                .Include(i => i.category)
                .Include(i => i.region)
                .Include(i => i.assignedDepartment)
                .FirstOrDefault(i => i.issueId == issueId);
        }
        // Get issue with all related details
        public Issue? GetWithDetails(int issueId)
        {
            return context.Issues
                .Include(i => i.reportedBy)
                .Include(i => i.category)
                .Include(i => i.region)
                .Include(i => i.assignedDepartment)
                .FirstOrDefault(i => i.issueId == issueId);
        }
        // Add new issue
        public void Add(Issue issue)
        {
            context.Issues.Add(issue);
            context.SaveChanges();
        }
        // Save updated issue
        public void Update()
        {
            context.SaveChanges();
        }
        // Delete issue
        public void Delete(Issue issue)
        {
            context.Issues.Remove(issue);
            context.SaveChanges();
        }
    }
}
