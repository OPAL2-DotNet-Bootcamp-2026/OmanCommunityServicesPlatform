using Isopoh.Cryptography.Argon2;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Enums;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Repositories;

namespace OmanCommunityServicesPlatform.Services
{
    public class UserService
    {
        private UserRepo repo;

        public UserService(UserRepo _repo)
        {
            repo = _repo;
        }

        public UserSummaryDto RegisterUser(RegisterUserDto dto)
        {
            // Business Rule: Email must be unique
            if (repo.EmailExists(dto.email))
            {
                return null;
            }

            User newUser = new User
            {
                fullName = dto.name,
                email = dto.email,
                passwordHash = Argon2.Hash(dto.password),
                phoneNumber = dto.phoneNumber,
                regionId = dto.regionId,
                role = UserRole.Citizen
            };

            repo.Add(newUser);

            return Response(newUser);
        }

        public UserSummaryDto LoginUser(LoginDto dto)
        {
            User user = repo.GetByEmail(dto.email);
            
            if (user == null)
            {
                return null;
            }

            bool validPassword = Argon2.Verify(dto.password, user.passwordHash);

            if (!validPassword)
            {
                return null;
            }

            return Response(user);
        }

        public UserSummaryDto Response(User user)
        {
            UserSummaryDto response = new UserSummaryDto
            {
                userId = user.userId,
                name = user.fullName,
                email = user.email,
                role = user.role
            };

            return response;
        }
    }
}
