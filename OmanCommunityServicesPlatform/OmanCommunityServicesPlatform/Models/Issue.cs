using OmanCommunityServicesPlatform.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OmanCommunityServicesPlatform.Models
{
    [Table("Issues")]
    public class Issue
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int issueId { get; set; }                  // system generated

        [Required]
        [MaxLength(150)]
        public string title { get; set; }                 // user input

        [Required]
        [MaxLength(2000)]
        public string description { get; set; }           // user input

        [Required]
        [MaxLength(300)]
        public string location { get; set; }              // user input
        public decimal? latitude { get; set; }            // optional user input
        public decimal? longitude { get; set; }           // optional user input

        [Required]
        public IssuePriority priority { get; set; }              // selected by user (Low | Medium | High)

        [Required]
        public IssueStatus currentStatus { get; set; } = IssueStatus.Open; // system default

        [Required]
        public DateTime reportedDate { get; set; } = DateTime.Now; // system generated

        ///////////////////////////////////////////////////////////////////////////

        // foreign key — every issue is reported by a user
        [Required]
        [ForeignKey(nameof(reportedBy))]
        public int reportedById { get; set; }             // system assigned

        public virtual User? reportedBy { get; set; }

        // foreign key — every issue must belong to a category
        [Required]
        [ForeignKey(nameof(category))]
        public int categoryId { get; set; }               // selected by user
        public virtual Category? category { get; set; }

        // foreign key — every issue must belong to a region
        [Required]
        [ForeignKey(nameof(region))]
        public int regionId { get; set; }                 // selected by user
        public virtual Region? region { get; set; }

        // foreign key — assigned automatically based on category
        [ForeignKey(nameof(assignedDepartment))]
        public int? assignedDepartmentId { get; set; }    // assigned automatically by system
        public virtual Department? assignedDepartment { get; set; }

        // reverse navigation — one issue has many status updates
        public virtual ICollection<StatusUpdate> statusUpdates { get; set; } 

        // reverse navigation — one issue has many comments
        public virtual ICollection<Comment> comments { get; set; } 

        // reverse navigation — one issue has many attachments
        public virtual ICollection<Attachment> attachments { get; set; } 

        // reverse navigation — one issue has many ratings
        public virtual ICollection<Rating> ratings { get; set; } 

        // reverse navigation — one issue has many notifications
        public virtual ICollection<Notification> notifications { get; set; } 
    }
}
