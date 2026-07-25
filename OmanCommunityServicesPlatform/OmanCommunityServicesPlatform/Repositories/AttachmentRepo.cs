using OmanCommunityServicesPlatform.Models;
namespace OmanCommunityServicesPlatform.Repositories
{
    public class AttachmentRepo
    {
        private OCSPContext context;
        public AttachmentRepo(OCSPContext _context)
        {
            context = _context;
        }
        // Get all attachments for a specific issue
        public List<Attachment> GetByIssueId(int issueId)
        {
            return context.Attachments
                .Where(a => a.issueId == issueId)
                .ToList();
        }
        // Get one attachment by ID
        public Attachment? GetById(int attachmentId)
        {
            return context.Attachments.FirstOrDefault(a => a.attachmentId == attachmentId);
        }
        // Check for a duplicate file on the same issue
        public Attachment? GetByIssueIdAndUrl(int issueId, string fileUrl)
        {
            return context.Attachments.FirstOrDefault(a => a.issueId == issueId && a.fileUrl == fileUrl);
        }
        // Add new attachment
        public void Add(Attachment attachment)
        {
            context.Attachments.Add(attachment);
            context.SaveChanges();
        }
        // Save updated attachment
        public void Update()
        {
            context.SaveChanges();
        }
        // Delete attachment
        public void Delete(Attachment attachment)
        {
            context.Attachments.Remove(attachment);
            context.SaveChanges();
        }
    }
}
