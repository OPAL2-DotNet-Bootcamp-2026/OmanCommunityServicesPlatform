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
        private DepartmentRepo departmentRepo;
        private RegionRepo regionRepo;

        public UserService(UserRepo _repo, DepartmentRepo _departmentRepo, RegionRepo _regionRepo)
        {
            userRepo = _repo;
            departmentRepo = _departmentRepo;
            regionRepo = _regionRepo;
        }

        public UserSummaryDto RegisterUser(RegisterUserDto dto)
        {
            // Business Rule: Email must be unique
            if (userRepo.EmailExists(dto.email))
            {
                return null;
            }

            if (!regionRepo.RegionExists(dto.regionId))
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
                if (userRepo.EmailExists(dto.email))
                {
                    return null;
                }
                user.email = dto.email;
            }

            if (dto.phoneNumber != null)
            {
                user.phoneNumber = dto.phoneNumber;
            }

            if (dto.regionId != null)
            {
                if (!regionRepo.RegionExists(dto.regionId))
                {
                    return null;
                }
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

        // Authorization Level must be Admin
        public UserSummaryDto ChangeUserRole(ChangeUserRoleDto dto)
        {
            User user = userRepo.GetById(dto.userId);

            if (user == null)
            {
                return null;
            }

            user.role = dto.role;

            // Clearing department if user downgraded to Citizen
            if (dto.role == UserRole.Citizen) 
            {
                user.departmentId = null;
            }
            
            userRepo.Update();

            return Response(user);
        }

        // Authorization Level must be Admin
        public AssignDepartmentResponseDto AssignDepartment(AssignDepartmentDto dto)
        {
            Department department = departmentRepo.GetDepartmentById(dto.departmentId);
            if (department == null)
            {
                return null;
            }

            User user = userRepo.GetById(dto.userId);

            if (user == null)
            {
                return null;
            }

            // Business Rule: User must be either Staff or Admin
            if (user.role == UserRole.Citizen)
            {
                return null;
            }

            user.departmentId = department.departmentId;
            userRepo.Update();

            AssignDepartmentResponseDto response = new AssignDepartmentResponseDto
            {
                userId = user.userId,
                name = user.fullName,
                email = user.email,
                role = user.role,
                departmentId = department.departmentId,
                departmentName = department.departmentName
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
