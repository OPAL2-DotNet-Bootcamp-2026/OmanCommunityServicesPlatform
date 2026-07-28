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
        private AuthService authService;
        private EmailService emailService;

        public UserService(UserRepo _repo, DepartmentRepo _departmentRepo, RegionRepo _regionRepo, AuthService _authService, EmailService _emailService)
        {
            userRepo = _repo;
            departmentRepo = _departmentRepo;
            regionRepo = _regionRepo;
            authService = _authService;
            emailService = _emailService;
        }

        public async Task<UserSummaryDto?> RegisterUser(RegisterUserDto dto)
        {
            // Business Rule: Email must be unique
            if (userRepo.EmailExists(dto.email))
            {
                return null;
            }

            if (dto.regionId.HasValue && regionRepo.GetById(dto.regionId.Value) == null)
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

            await emailService.SendEmailAsync(
            newUser.email,
            "Welcome to Oman Community Services",
            $"Hi {newUser.fullName}, your account has been created."
            );

            return Response(newUser);
        }

        public async Task<LoginResponseDto?> LoginUser(LoginDto dto)
        {
            User user = userRepo.GetByEmail(dto.email);
            
            if (user == null)
            {
                return null;
            }

            if (!user.isActive)
            {
                return null;
            }

            bool validPassword = Argon2.Verify(user.passwordHash, dto.password);

            if (!validPassword)
            {
                return null;
            }

            string token = authService.GenerateToken(user);

            await emailService.SendEmailAsync(
                user.email,
                "New Sign-In Detected",
                $"Hi {user.fullName}, we noticed a new sign-in to your account at {DateTime.UtcNow:u} UTC."
            );

            LoginResponseDto response = new LoginResponseDto();
            response.Token = token;
            response.userId = user.userId;
            response.name = user.fullName;
            response.role = user.role;

            return response;
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
                if (regionRepo.GetById((int)dto.regionId) == null)
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

        // Authorization Level must be Admin
        public bool DeactivateUser(int userId, int requestingAdminId)
        {
            User user = userRepo.GetById(userId);

            if (user == null)
            {
                return false;
            }

            // Prevent an Admin from deactivating their own account
            if (userId == requestingAdminId)
            {
                return false;
            }

            user.isActive = false;
            userRepo.Update();

            return true;
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
