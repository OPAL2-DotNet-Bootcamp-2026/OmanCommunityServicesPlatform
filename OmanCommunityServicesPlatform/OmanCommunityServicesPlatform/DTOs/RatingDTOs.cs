using System.ComponentModel.DataAnnotations;

namespace OmanCommunityServicesPlatform
{
 
    // Used when creating a new rating

    public class CreateRatingDto
    {
        [Required]
        public int issueId { get; set; }
        // Foreign key referencing the issue being rated

        [Required (ErrorMessage = "Score must be between 1 and 5.")]
    
        public int score { get; set; }
        // User input
       
        public string? feedback { get; set; }
        // Optional user input
    }

    // Used when updating an existing rating
    public class UpdateRatingDto
    {
        [Required(ErrorMessage = "Score must be between 1 and 5.")]

        public int score { get; set; }
        // Updated score from the user

        public string? feedback { get; set; }
        // Updated optional feedback
    }     
    
}



