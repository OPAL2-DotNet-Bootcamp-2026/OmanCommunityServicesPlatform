using Microsoft.EntityFrameworkCore;
using OmanCommunityServicesPlatform.Models;

namespace OmanCommunityServicesPlatform
{
    public class OCSPContext    :   DbContext
    {
        public DbSet<Attachment>    Attachments     { get; set; }
        public DbSet<Category>      Categories      { get; set; }
        public DbSet<Comment>       Comments        { get; set; }
        public DbSet<Department>    Departments     { get; set; }
        public DbSet<Issue>         Issues          { get; set; }
        public DbSet<Notification>  Notifications   { get; set; }
        public DbSet<Rating>        Ratings         { get; set; }
        public DbSet<Region>        Regions         { get; set; }
        public DbSet<StatusUpdate>  StatusUpdates   { get; set; }
        public DbSet<User>          Users           { get; set; }

        public OCSPContext(DbContextOptions<OCSPContext> options) : base(options)
        {
        }
    }
}
