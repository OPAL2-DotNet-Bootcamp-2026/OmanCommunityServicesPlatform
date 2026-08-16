using Isopoh.Cryptography.Argon2;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Enums;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Repositories;

namespace OmanCommunityServicesPlatform.Services
{
    public class UserService
    {
        private readonly UserRepo userRepo;
        private readonly DepartmentRepo departmentRepo;
        private readonly RegionRepo regionRepo;
        private readonly AuthService authService;
        private readonly EmailService emailService;
        private readonly ILogger<UserService> logger;

        public UserService(
            UserRepo _repo,
            DepartmentRepo _departmentRepo,
            RegionRepo _regionRepo,
            AuthService _authService,
            EmailService _emailService,
            ILogger<UserService> _logger)
        {
            userRepo = _repo;
            departmentRepo = _departmentRepo;
            regionRepo = _regionRepo;
            authService = _authService;
            emailService = _emailService;
            logger = _logger;
        }

        public async Task<UserSummaryDto?> RegisterUser(RegisterUserDto dto)
        {
            // Business Rule: Email must be unique
            if (userRepo.EmailExists(dto.email))
            {
                logger.LogWarning("Registration failed for email {Email} — email already exists", dto.email);
                return null;
            }

            if (dto.regionId.HasValue && regionRepo.GetById(dto.regionId.Value) == null)
            {
                logger.LogWarning("Registration failed for email {Email} — region {RegionId} not found", dto.email, dto.regionId.Value);
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
            logger.LogInformation("New user registered: {UserId}, {Email} with role {Role}", newUser.userId, newUser.email, newUser.role);

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
                logger.LogWarning("Failed login attempt for {Email} — user not found", dto.email);
                return null;
            }

            if (!user.isActive)
            {
                logger.LogWarning("Failed login attempt for {Email} — account is deactivated", dto.email);
                return null;
            }

            bool validPassword = Argon2.Verify(user.passwordHash, dto.password);

            if (!validPassword)
            {
                logger.LogWarning("Failed login attempt for {Email} — invalid password", dto.email);
                return null;
            }

            string token = authService.GenerateToken(user);
            logger.LogInformation("User {UserId} logged in successfully ({Email})", user.userId, user.email);

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
                logger.LogWarning("Update profile failed: user {UserId} not found", id);
                return null;
            }

            if (dto.email != null)
            {
                if (userRepo.EmailExists(dto.email))
                {
                    logger.LogWarning("Update profile failed for user {UserId}: email {Email} already in use", id, dto.email);
                    return null;
                }
                user.email = dto.email;
            }

            if (dto.name != null)
            {
                user.fullName = dto.name;
            }

            if (dto.phoneNumber != null)
            {
                user.phoneNumber = dto.phoneNumber;
            }

            if (dto.regionId != null)
            {
                if (regionRepo.GetById((int)dto.regionId) == null)
                {
                    logger.LogWarning("Update profile failed for user {UserId}: region {RegionId} not found", id, dto.regionId);
                    return null;
                }
                user.regionId = dto.regionId;
            }

            userRepo.Update();
            logger.LogInformation("Profile updated for user {UserId}", id);
            
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
                logger.LogWarning("Change role failed: user {UserId} not found", dto.userId);
                return null;
            }

            UserRole oldRole = user.role;
            user.role = dto.role;

            // Clearing department if user downgraded to Citizen
            if (dto.role == UserRole.Citizen) 
            {
                user.departmentId = null;
            }
            
            userRepo.Update();
            logger.LogInformation("User {UserId} role changed from {OldRole} to {NewRole}", dto.userId, oldRole, dto.role);

            return Response(user);
        }

        // Authorization Level must be Admin
        public AssignDepartmentResponseDto AssignDepartment(AssignDepartmentDto dto)
        {
            Department department = departmentRepo.GetDepartmentById(dto.departmentId);
            if (department == null)
            {
                logger.LogWarning("Assign department failed: department {DepartmentId} not found", dto.departmentId);
                return null;
            }

            User user = userRepo.GetById(dto.userId);

            if (user == null)
            {
                logger.LogWarning("Assign department failed: user {UserId} not found", dto.userId);
                return null;
            }

            // Business Rule: User must be either Staff or Admin
            if (user.role == UserRole.Citizen)
            {
                logger.LogWarning("Assign department rejected: user {UserId} has Citizen role", dto.userId);
                return null;
            }

            user.departmentId = department.departmentId;
            userRepo.Update();
            logger.LogInformation("User {UserId} assigned to department {DepartmentId} ({DepartmentName})", user.userId, department.departmentId, department.departmentName);

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
                logger.LogWarning("Deactivate user failed: user {UserId} not found", userId);
                return false;
            }

            // Prevent an Admin from deactivating their own account
            if (userId == requestingAdminId)
            {
                logger.LogWarning("Admin {AdminId} attempted to deactivate their own account", requestingAdminId);
                return false;
            }

            user.isActive = false;
            userRepo.Update();
            logger.LogInformation("User {UserId} deactivated by admin {AdminId}", userId, requestingAdminId);

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
