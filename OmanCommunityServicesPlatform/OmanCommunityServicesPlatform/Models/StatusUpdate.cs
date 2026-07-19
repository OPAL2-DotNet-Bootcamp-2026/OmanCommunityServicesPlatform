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
        public int issueId { get; set; }     // related issue
        public virtual Issue? issue { get; set; }

        // foreign key — updated by a staff user
        [Required]
        [ForeignKey(nameof(updatedBy))]
        public int updatedById { get; set; }    // staff who updated the status
        public virtual User? updatedBy { get; set; }

        /////////////////////////////////////////////////////////

        [Required]
        [MaxLength(20)]
        public string previousStatus { get; set; }   // previous issue status

        [Required]
        [MaxLength(20)]
        public string newStatus { get; set; }        // new issue status

        [MaxLength(500)]
        public string? notes { get; set; }           // optional user input

        [Required]
        public DateTime updatedAt { get; set; } = DateTime.Now; // system generated
    }
}

