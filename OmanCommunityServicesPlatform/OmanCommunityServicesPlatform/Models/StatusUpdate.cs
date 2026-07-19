using OmanCommunityServicesPlatform.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OmanCommunityServicesPlatform.Models
{
    [Table("StatusUpdates")]
    public class StatusUpdate
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int statusUpdateId { get; set; }      // system generated

        /////////////////////////////////////////////////////////

        // foreign key — status update belongs to an issue
        [Required]
        [ForeignKey(nameof(issue))]
        public int issueId { get; set; }     // Foreign Key
        public Issue? issue { get; set; }

        // foreign key — updated by a staff user
        [Required]
        [ForeignKey(nameof(updatedBy))]
        public int updatedById { get; set; }    // Foreign Key
        public User? updatedBy { get; set; }

        /////////////////////////////////////////////////////////

        [Required]
        [MaxLength(20)]
        public IssueStatus previousStatus { get; set; }    // Calculated

        [Required]
        [MaxLength(20)]
        public IssueStatus newStatus { get; set; }       // From List
        [MaxLength(500)]
        public string? notes { get; set; }           // optional user input

        [Required]
        public DateTime updatedAt { get; set; } = DateTime.UtcNow; // Default Value
    }
}

