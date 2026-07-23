using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Repositories;

namespace OmanCommunityServicesPlatform.Services
{
    public class DepartmentService
    {
        private DepartmentRepo departmentRepo;
        public DepartmentService(DepartmentRepo _departmentRepo)
        {
            departmentRepo = _departmentRepo;
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
                    dto.regionName = department.region.regionName;
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
                return null;

            Department department = new Department();
            department.departmentName = dto.departmentName;
            department.description = dto.description;
            department.contactEmail = dto.contactEmail;
            department.regionId = dto.regionId;
            departmentRepo.Add(department);
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
                return null;

            // department name must not duplicate another department
            if (department.departmentName != dto.departmentName && departmentRepo.IsDepartmentNameExist(dto.departmentName))
            {
                return null;
            }

            department.departmentName = dto.departmentName;
            department.description = dto.description;
            department.contactEmail = dto.contactEmail;
            department.regionId = dto.regionId;

            departmentRepo.Update();

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
                return false;
            departmentRepo.Delete(department);
            return true;
        }
    }
}
