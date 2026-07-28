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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>()
                .Property(u => u.role)
                .HasConversion<string>();

            modelBuilder.Entity<Issue>()
                .Property(i => i.currentStatus)
                .HasConversion<string>();

            modelBuilder.Entity<Issue>()
                .Property(i => i.priority)
                .HasConversion<string>();

            modelBuilder.Entity<Region>()
                .Property(r => r.governorate)
                .HasConversion<string>();

            modelBuilder.Entity<Notification>()
                .Property(n => n.type)
                .HasConversion<string>();

            modelBuilder.Entity<Attachment>()
                .Property(a => a.fileType)
                .HasConversion<string>();
        }
    }
}
