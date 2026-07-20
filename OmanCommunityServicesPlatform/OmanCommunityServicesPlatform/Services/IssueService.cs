using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Enums;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Repositories;

namespace OmanCommunityServicesPlatform.Services
{
    public class IssueService
    {
        private IssueRepo issueRepo;
        public IssueService(IssueRepo _issueRepo)
        {
            issueRepo = _issueRepo;
        }

        //create Issue 
        public IssueResponseDto Create(CreateIssueDto dto)
        {
            Issue issue = new Issue();

            issue.title = dto.title;
            issue.description = dto.description;
            issue.location = dto.location;
            issue.latitude = dto.latitude;
            issue.longitude = dto.longitude;
            issue.priority = dto.priority;
            issue.categoryId = dto.categoryId;

            // System values
            issue.currentStatus = IssueStatus.Open;
            issue.reportedDate = DateTime.UtcNow;

            issueRepo.Add(issue);

            IssueResponseDto response = new IssueResponseDto();

            response.issueId = issue.issueId;
            response.title = issue.title;
            response.description = issue.description;
            response.location = issue.location;
            response.latitude = issue.latitude;
            response.longitude = issue.longitude;
            response.priority = issue.priority;
            response.currentStatus = issue.currentStatus;
            response.reportedDate = issue.reportedDate;

            return response;
        }
        // Get All Issues
        public List<IssueResponseDto> GetAll()
        {
            List<Issue> issues = issueRepo.GetAll();

            List<IssueResponseDto> response = new List<IssueResponseDto>();

            foreach (Issue issue in issues)
            {
                IssueResponseDto dto = new IssueResponseDto();

                dto.issueId = issue.issueId;
                dto.title = issue.title;
                dto.description = issue.description;
                dto.location = issue.location;
                dto.latitude = issue.latitude;
                dto.longitude = issue.longitude;
                dto.priority = issue.priority;
                dto.currentStatus = issue.currentStatus;
                dto.reportedDate = issue.reportedDate;

                response.Add(dto);
            }

            return response;
        }
        // Get Issue By Id 
        public IssueResponseDto GetById(int id)
        {
            Issue issue = issueRepo.GetById(id);

            if (issue == null)
                return null;

            IssueResponseDto response = new IssueResponseDto();

            response.issueId = issue.issueId;
            response.title = issue.title;
            response.description = issue.description;
            response.location = issue.location;
            response.latitude = issue.latitude;
            response.longitude = issue.longitude;
            response.priority = issue.priority;
            response.currentStatus = issue.currentStatus;
            response.reportedDate = issue.reportedDate;

            return response;
        }
        //  Change Issue Status
        public IssueResponseDto ChangeStatus(int id, ChangeIssueStatusDto dto)
        {
            Issue issue = issueRepo.GetById(id);

            if (issue == null)
                return null;

            issue.currentStatus = dto.newStatus;

            issueRepo.Update();

            IssueResponseDto response = new IssueResponseDto();

            response.issueId = issue.issueId;
            response.title = issue.title;
            response.description = issue.description;
            response.location = issue.location;
            response.latitude = issue.latitude;
            response.longitude = issue.longitude;
            response.priority = issue.priority;
            response.currentStatus = issue.currentStatus;
            response.reportedDate = issue.reportedDate;

            return response;
        }
        // Delete Issue 
        public bool Delete(int id)
        {
            Issue issue = issueRepo.GetById(id);

            if (issue == null)
                return false;

            issueRepo.Delete(issue);

            return true;
        }
    }
}
