using Microsoft.EntityFrameworkCore;
using OmanCommunityServicesPlatform.Enums;
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
                .Include (i => i.assignedDepartment)
                .FirstOrDefault(i => i.issueId == issueId);
               
        }
        //  Get all issues created by a specific user
        public List<Issue> GetByReportedById(int reportedById)
        {
            return context.Issues
                .Include(i => i.category)
                .Include(i => i.region)
                .Include(i => i.assignedDepartment)
                .Where(i => i.reportedById == reportedById)
                .ToList();
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

        // Check Issue Exists
        public bool Exists(int id)
        {
            return context.Issues.Any(i => i.issueId == id);
        }

        // Delete issue
        public void Delete(Issue issue)
        {
            context.Issues.Remove(issue);
            context.SaveChanges();
        }
        // Get Issues By Status
        public List<Issue> GetIssueByStatus(IssueStatus status)
        {
            return context.Issues
                .Include(i => i.category)
                .Include(i => i.region)
                .Include(i => i.assignedDepartment)
                .Where(i => i.currentStatus == status)
                .ToList();
        }

        // Get Issues By Priority
        public List<Issue> GetIssueByPriority(IssuePriority priority)
        {
            return context.Issues
                .Include(i => i.category)
                .Include(i => i.region)
                .Include(i => i.assignedDepartment)
                .Where(i => i.priority == priority)
                .ToList();
        }

        // Get Issues By Category
        public List<Issue> GetIssueByCategory(int categoryId)
        {
            return context.Issues
                .Include(i => i.category)
                .Include(i => i.region)
                .Include(i => i.assignedDepartment)
                .Where(i => i.categoryId == categoryId)
                .ToList();
        }

        // Get Issues By Department
        public List<Issue> GetIssueByDepartment(int departmentId)
        {
            return context.Issues
                .Include(i => i.category)
                .Include(i => i.region)
                .Include(i => i.assignedDepartment)
                .Where(i => i.assignedDepartmentId == departmentId)
                .ToList();
        }
    }
}
