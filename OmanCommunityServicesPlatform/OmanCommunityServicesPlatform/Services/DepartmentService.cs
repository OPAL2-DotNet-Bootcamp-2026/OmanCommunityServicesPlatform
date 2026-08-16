using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Repositories;

namespace OmanCommunityServicesPlatform.Services
{
    public class DepartmentService
    {
        private readonly DepartmentRepo departmentRepo;
        private readonly RegionRepo regionRepo;
        private readonly ILogger<DepartmentService> logger;

        public DepartmentService(
            DepartmentRepo _departmentRepo,
            RegionRepo _regionRepo,
            ILogger<DepartmentService> _logger)
        {
            departmentRepo = _departmentRepo;
            regionRepo = _regionRepo;
            logger = _logger;
        }
        //Get all departments
        public List<ResponseDepartmentDTO> GetAllDepartments()
        {
            List<Department> departments = departmentRepo.GetAllDepartments();
            List<ResponseDepartmentDTO> response = new List<ResponseDepartmentDTO>();

            foreach (Department department in departments)
            {
                ResponseDepartmentDTO dto = new ResponseDepartmentDTO();
                dto.departmentId = department.departmentId;
                dto.departmentName = department.departmentName;
                dto.description = department.description;
                dto.contactEmail = department.contactEmail;
                dto.regionId = department.regionId;

                if (department.region != null)
                {
                    dto.regionName = department.region.regionName;
                }
                dto.categoryCount = department.Categories.Count;
                dto.issueCount = department.Issues.Count;
                dto.userCount = department.Users.Count;
                response.Add(dto);
            }
            return response;
        }
        //Get department by id
        public ResponseDepartmentDTO GetById(int id)
        {
            Department department = departmentRepo.GetDepartmentById(id);
            if (department == null)
                return null;

            ResponseDepartmentDTO response = new ResponseDepartmentDTO();

            response.departmentId = department.departmentId;
            response.departmentName = department.departmentName;
            response.description = department.description;
            response.contactEmail = department.contactEmail;
            response.regionId = department.regionId;

            if (department.region != null)
                response.regionName = department.region.regionName;

            response.categoryCount = department.Categories.Count;
            response.issueCount = department.Issues.Count;
            response.userCount = department.Users.Count;
            return response;
        }
        //Create department
        public ResponseDepartmentDTO Create(CreateDepartmentDTO dto)
        {

            // department name must be unique
            if (departmentRepo.IsDepartmentNameExist(dto.departmentName))
            {
                logger.LogWarning("Department creation rejected: department name {DepartmentName} already exists", dto.departmentName);
                return null;
            }

            Department department = new Department();
            department.departmentName = dto.departmentName;
            department.description = dto.description;
            department.contactEmail = dto.contactEmail;
            // Check region exists
            if (dto.regionId.HasValue && !regionRepo.Exists(dto.regionId.Value))
            {
                logger.LogWarning("Department creation rejected: region {RegionId} not found", dto.regionId.Value);
                return null;
            }
            department.regionId = dto.regionId;
            departmentRepo.Add(department);
            logger.LogInformation("Department {DepartmentId} ({DepartmentName}) created", department.departmentId, department.departmentName);

            ResponseDepartmentDTO response = new ResponseDepartmentDTO();
            response.departmentId = department.departmentId;
            response.departmentName = department.departmentName;
            response.description = department.description;
            response.contactEmail = department.contactEmail;
            response.regionId = department.regionId;

            return response;
        }
        //Update department
        public ResponseDepartmentDTO Update(int id, UpdateDepartmentDTO dto)
        {

            Department department = departmentRepo.GetDepartmentById(id);

            if (department == null)
            {
                logger.LogWarning("Department update failed: department {DepartmentId} not found", id);
                return null;
            }

            // department name must not duplicate another department
            if (department.departmentName != dto.departmentName && departmentRepo.IsDepartmentNameExist(dto.departmentName))
            {
                logger.LogWarning("Department update rejected: department name {DepartmentName} already exists", dto.departmentName);
                return null;
            }

            department.departmentName = dto.departmentName;
            department.description = dto.description;
            department.contactEmail = dto.contactEmail;
            if (dto.regionId.HasValue && !regionRepo.Exists(dto.regionId.Value))
            {
                logger.LogWarning("Department update rejected: region {RegionId} not found", dto.regionId.Value);
                return null;
            }
            department.regionId = dto.regionId;

            departmentRepo.Update();
            logger.LogInformation("Department {DepartmentId} ({DepartmentName}) updated", id, dto.departmentName);

            ResponseDepartmentDTO response = new ResponseDepartmentDTO();
            response.departmentId = department.departmentId;
            response.departmentName = department.departmentName;
            response.description = department.description;
            response.contactEmail = department.contactEmail;
            response.regionId = department.regionId;

            return response;
        }
        //Delete department
        public bool Delete(int id)
        {
            Department department = departmentRepo.GetDepartmentById(id);
            if (department == null)
            {
                logger.LogWarning("Department deletion failed: department {DepartmentId} not found", id);
                return false;
            }
            departmentRepo.Delete(department);
            logger.LogInformation("Department {DepartmentId} ({DepartmentName}) deleted", id, department.departmentName);
            return true;
        }
    }
}
