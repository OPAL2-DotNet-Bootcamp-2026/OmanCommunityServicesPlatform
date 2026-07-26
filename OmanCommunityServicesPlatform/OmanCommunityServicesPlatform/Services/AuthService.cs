using Microsoft.IdentityModel.Tokens;
using OmanCommunityServicesPlatform.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace OmanCommunityServicesPlatform.Services
{
    public class AuthService
    {
        private IConfiguration config;
        // IConfiguration is injected — reads JwtSettings from appsettings.json
        public AuthService(IConfiguration _config)
        {
            config = _config;
        }
        // Called by UserService.LoginUser() after credentials are validated
        public string GenerateToken(User user)
        {
            string secretKey = config["JwtSettings: SecretKey"];
            string issuer = config["JwtSettings: Issuer"];
            string audience = config["JwtSettings: Audience"];
            int hours = int.Parse(config["JwtSettings: ExpiryHours"]);
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            // Claims — the data embedded inside the token payload
            Claim[] claims = {
                new Claim("sub", user.fullName),
                new Claim("userId", user.userId.ToString()),
                new Claim("role", user.role.ToString())
            };
            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(hours),
                signingCredentials: credentials
            );
            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}