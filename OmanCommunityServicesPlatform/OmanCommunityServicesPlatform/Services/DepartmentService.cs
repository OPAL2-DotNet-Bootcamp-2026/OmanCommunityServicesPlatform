using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Repositories;

namespace OmanCommunityServicesPlatform.Services
{
    public class DepartmentService
    {
        private DepartmentRepo departmentRepo;
        private RegionRepo regionRepo;

        public DepartmentService(DepartmentRepo _departmentRepo, RegionRepo _regionRepo)
        {
            departmentRepo = _departmentRepo;
            regionRepo = _regionRepo;
        }

        // Get all departments
        public List<ResponseDepartmentDTO> GetAllDepartments()
        {
            List<Department> departments = departmentRepo.GetAllDepartments();
            List<ResponseDepartmentDTO> response = new List<ResponseDepartmentDTO>();

            foreach (Department department in departments)
            {
                ResponseDepartmentDTO dto = new ResponseDepartmentDTO
                {
                    departmentId = department.departmentId,
                    departmentName = department.departmentName,
                    description = department.description,
                    contactEmail = department.contactEmail,
                    regionId = department.regionId,
                    regionName = department.region?.regionName,
                    categoryCount = department.Categories?.Count ?? 0,
                    issueCount = department.Issues?.Count ?? 0,
                    userCount = department.Users?.Count ?? 0
                };

                response.Add(dto);
            }
            return response;
        }

        // Get department by id
        public ResponseDepartmentDTO GetById(int id)
        {
            Department department = departmentRepo.GetDepartmentById(id);
            if (department == null)
                return null;

            return new ResponseDepartmentDTO
            {
                departmentId = department.departmentId,
                departmentName = department.departmentName,
                description = department.description,
                contactEmail = department.contactEmail,
                regionId = department.regionId,
                regionName = department.region?.regionName,
                categoryCount = department.Categories?.Count ?? 0,
                issueCount = department.Issues?.Count ?? 0,
                userCount = department.Users?.Count ?? 0
            };
        }

        // Create department
        public ResponseDepartmentDTO Create(CreateDepartmentDTO dto)
        {
            // Unique department name rule
            if (departmentRepo.IsDepartmentNameExist(dto.departmentName))
                return null;

            string regionName = null;

            // Validate region and get regionName before saving
            if (dto.regionId.HasValue)
            {
                var region = regionRepo.GetById(dto.regionId.Value);
                if (region == null)
                {
                    return null; // Invalid Region ID
                }
                regionName = region.regionName;
            }

            Department department = new Department
            {
                departmentName = dto.departmentName,
                description = dto.description,
                contactEmail = dto.contactEmail,
                regionId = dto.regionId
            };

            departmentRepo.Add(department);

            return new ResponseDepartmentDTO
            {
                departmentId = department.departmentId,
                departmentName = department.departmentName,
                description = department.description,
                contactEmail = department.contactEmail,
                regionId = department.regionId,
                regionName = regionName,
                categoryCount = 0,
                issueCount = 0,
                userCount = 0
            };
        }

        // Update department
        public ResponseDepartmentDTO Update(int id, UpdateDepartmentDTO dto)
        {
            Department department = departmentRepo.GetDepartmentById(id);
            if (department == null)
                return null;

            // Duplicate name check
            if (department.departmentName != dto.departmentName && departmentRepo.IsDepartmentNameExist(dto.departmentName))
            {
                return null;
            }

            string regionName = null;

            if (dto.regionId.HasValue)
            {
                var region = regionRepo.GetById(dto.regionId.Value);
                if (region == null)
                {
                    return null;
                }
                regionName = region.regionName;
            }

            department.departmentName = dto.departmentName;
            department.description = dto.description;
            department.contactEmail = dto.contactEmail;
            department.regionId = dto.regionId;

            departmentRepo.Update();

            return new ResponseDepartmentDTO
            {
                departmentId = department.departmentId,
                departmentName = department.departmentName,
                description = department.description,
                contactEmail = department.contactEmail,
                regionId = department.regionId,
                regionName = regionName,
                categoryCount = department.Categories?.Count ?? 0,
                issueCount = department.Issues?.Count ?? 0,
                userCount = department.Users?.Count ?? 0
            };
        }

        // Delete department
        public bool Delete(int id)
        {
            Department department = departmentRepo.GetDepartmentById(id);
            if (department == null)
                return false;

            departmentRepo.Delete(department);
            return true;
        }
    }
}