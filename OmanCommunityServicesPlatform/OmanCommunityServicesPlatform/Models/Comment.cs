using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OmanCommunityServicesPlatform.Models
{
    [Table("Comments")]
    public class Comment
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int commentId { get; set; }      // system generated

        /////////////////////////////////////////////////////////

        // foreign key — comment belongs to an issue
        [Required]
        [ForeignKey(nameof(issue))]
        public int issueId { get; set; }        // related issue
        public virtual Issue? issue { get; set; }

        // foreign key — comment created by a user
        [Required]
        [ForeignKey(nameof(user))]
        public int userId { get; set; }         // comment author
        public virtual User? user { get; set; }

        /////////////////////////////////////////////////////////

        [Required]
        [MaxLength(1000)]
        public string content { get; set; }     // user input

        public bool isStaffComment { get; set; } = false; // system default

        [Required]
        public DateTime commentDate { get; set; } = DateTime.Now; // system generated
    }
}

