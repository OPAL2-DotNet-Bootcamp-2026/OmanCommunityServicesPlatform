using Isopoh.Cryptography.Argon2;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Enums;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Repositories;

namespace OmanCommunityServicesPlatform.Services
{
    public class UserService
    {
        private UserRepo userRepo;

        public UserService(UserRepo _repo)
        {
            userRepo = _repo;
        }

        public UserSummaryDto RegisterUser(RegisterUserDto dto)
        {
            // Business Rule: Email must be unique
            if (userRepo.EmailExists(dto.email))
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

            userRepo.Add(newUser);

            return Response(newUser);
        }

        public UserSummaryDto LoginUser(LoginDto dto)
        {
            User user = userRepo.GetByEmail(dto.email);
            
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

        public UpdateProfileDto UpdateUserProfile(int id, UpdateProfileDto dto)
        {
            // Check user Existance using Token
            // Implement Here

            User user = userRepo.GetById(id);
            
            if (user == null)
            {
                return null;
            }

            if (dto.name != null)
            {
                user.fullName = dto.name;
            }

            if (dto.email != null)
            {
                if (!userRepo.EmailExists(dto.email))
                {
                    user.email = dto.email;
                }
            }

            if (dto.phoneNumber != null)
            {
                user.phoneNumber = dto.phoneNumber;
            }

            if (dto.regionId != null)
            {
                user.regionId = dto.regionId;
            }

            userRepo.Update();
            
            UpdateProfileDto response = new UpdateProfileDto
            {
                name = user.fullName,
                email = user.email,
                phoneNumber = user.phoneNumber,
                regionId = user.regionId
            };

            return response;
        }

        public UserSummaryDto ChangeUserRole(ChangeUserRoleDto dto)
        {
            User user = userRepo.GetById(dto.userId);

            if (user == null)
            {
                return null;
            }

            user.role = dto.role;
            userRepo.Update();

            return Response(user);
        }

        public AssignDepartmentResponeDto AssignDepartment(AssignDepartmentResponeDto dto)
        {
            User user = userRepo.GetById(dto.userId);

            if (user == null)
            {
                return null;
            }

            // Business Rule: User must be wither Staff or Admin
            if (user.role != UserRole.Admin || user.role != UserRole.Staff)
            {
                return null;
            }

            user.departmentId = dto.departmentId;
            userRepo.Update();

            AssignDepartmentResponeDto response = new AssignDepartmentResponeDto
            {
                userId = user.userId,
                name = user.fullName,
                email = user.email,
                role = user.role,
                departmentId = (int)user.departmentId,
                departmentName = user.Department.departmentName
            };

            return response;
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
