using System.Security.Claims;

namespace OmanCommunityServicesPlatform
{
      // Helper methods for authenticated user claims
        public static class ClaimsPrincipalExtensions
        {
            // Try to read userId from the JWT token
            public static bool TryGetUserId(
                this ClaimsPrincipal user,
                out int userId)
            {
                return int.TryParse(
                    user.FindFirst("userId")?.Value,
                    out userId);
            }
        }
}
