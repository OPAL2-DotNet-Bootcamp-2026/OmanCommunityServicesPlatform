using System.ComponentModel.DataAnnotations;

namespace OmanCommunityServicesPlatform.DTOs
{
    // Used to return rating information from the API

    public class RatingDTOs
    {
        // Used when creating a new rating

        public class CreateRatingDto
        {
            [Required]
            public int issueId { get; set; }
            // Foreign key referencing the issue being rated

            [Required]
            public int userId { get; set; }
            // Foreign key referencing the user who submits the rating

            [Required]
            [Range(
                1,
                5,
                ErrorMessage = "Score must be between 1 and 5."
            )]
            public int score { get; set; }
            // User input
            [StringLength(
            500,
            ErrorMessage = "Feedback cannot exceed 500 characters."
        )]
            public string? feedback { get; set; }
            // Optional user input
        }

        // Used when updating an existing rating
        public class UpdateRatingDto
        {
            [Required]
            [Range(
            1,
            5,
            ErrorMessage = "Score must be between 1 and 5."
        )]

            public int score { get; set; }
            // Updated score from the user

            [StringLength(
            500,
            ErrorMessage = "Feedback cannot exceed 500 characters."
                )]
            public string? feedback { get; set; }
            // Updated optional feedback
        }

        // Used to return rating information from the API
        public class RatingDto
        {
            public int ratingId { get; set; }
            // System-generated rating ID

            public int issueId { get; set; }
            // Foreign key of the rated issue

            public string issueTitle { get; set; } = string.Empty;
            // Title of the related issue

            public int userId { get; set; }
            // Foreign key of the user who submitted the rating

        }
    }
}



