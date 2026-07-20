using OmanCommunityServicesPlatform.Models;

namespace OmanCommunityServicesPlatform.Repositories
{
    public class StatusUpdateRepo
    {
        private OCSPContext context;
        public StatusUpdateRepo(OCSPContext _context)
        {
            context = _context;
        }

        // Get all status updates
        public List<StatusUpdate> GetAll()
        {
            return context.StatusUpdates.ToList();
        }

        // Get one status update by ID
        public StatusUpdate? GetById(int statusUpdateId)
        {
            return context.StatusUpdates.FirstOrDefault(s => s.statusUpdateId == statusUpdateId);
        }

        // Get all status updates for a specific issue
        public List<StatusUpdate> GetByIssueId(int issueId)
        {
            return context.StatusUpdates
                .Where(s => s.issueId == issueId)
                .OrderByDescending(s => s.updatedAt)
                .ToList();
        }

        // Add new status update
        public void Add(StatusUpdate statusUpdate)
        {
            context.StatusUpdates.Add(statusUpdate);
            context.SaveChanges();
        }

        // Delete status update
        public void Delete(StatusUpdate statusUpdate)
        {
            context.StatusUpdates.Remove(statusUpdate);
            context.SaveChanges();
        }
    }
}

