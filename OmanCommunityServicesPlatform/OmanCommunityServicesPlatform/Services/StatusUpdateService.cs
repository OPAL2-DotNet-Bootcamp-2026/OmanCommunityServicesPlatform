using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Repositories;

namespace OmanCommunityServicesPlatform.Services
{
    public class StatusUpdateService
    {
        private StatusUpdateRepo statusUpdateRepo;
        private IssueRepo issueRepo;

        public StatusUpdateService(StatusUpdateRepo _statusUpdateRepo, IssueRepo _issueRepo)
        {
            statusUpdateRepo = _statusUpdateRepo;
            issueRepo = _issueRepo;
        }

        // Create Status Update
        public StatusUpdateResponseDto Create(CreateStatusUpdateDto dto)
        {
            Issue? issue = issueRepo.GetById(dto.issueId);

            if (issue == null)
                return null;

            StatusUpdate statusUpdate = new StatusUpdate();

            statusUpdate.issueId = issue.issueId;  
            statusUpdate.previousStatus = issue.currentStatus;
            statusUpdate.newStatus = dto.newStatus;
            statusUpdate.notes = dto.notes;
            statusUpdate.updatedAt = DateTime.UtcNow;

            // Update issue current status
            issue.currentStatus = dto.newStatus;

            statusUpdateRepo.Add(statusUpdate);
            issueRepo.Update();

            StatusUpdateResponseDto response = new StatusUpdateResponseDto();

            response.statusUpdateId = statusUpdate.statusUpdateId;
            response.issueId = statusUpdate.issueId;
            response.updatedById = statusUpdate.updatedById;
            response.previousStatus = statusUpdate.previousStatus;
            response.newStatus = statusUpdate.newStatus;
            response.notes = statusUpdate.notes;
            response.updatedAt = statusUpdate.updatedAt;

            return response;
        }

        // Get All Status Updates
        public List<StatusUpdateResponseDto> GetAll()
        {
            List<StatusUpdate> updates = statusUpdateRepo.GetAll();

            List<StatusUpdateResponseDto> response = new List<StatusUpdateResponseDto>();

            foreach (StatusUpdate update in updates)
            {
                StatusUpdateResponseDto dto = new StatusUpdateResponseDto();

                dto.statusUpdateId = update.statusUpdateId;
                dto.issueId = update.issueId;
                dto.updatedById = update.updatedById;
                dto.previousStatus = update.previousStatus;
                dto.newStatus = update.newStatus;
                dto.notes = update.notes;
                dto.updatedAt = update.updatedAt;

                response.Add(dto);
            }

            return response;
        }

        // Get Status Update By Id
        public StatusUpdateResponseDto GetById(int id)
        {
            StatusUpdate? statusUpdate = statusUpdateRepo.GetById(id);

            if (statusUpdate == null)
                return null;

            StatusUpdateResponseDto response = new StatusUpdateResponseDto();

            response.statusUpdateId = statusUpdate.statusUpdateId;
            response.issueId = statusUpdate.issueId;
            response.updatedById = statusUpdate.updatedById;
            response.previousStatus = statusUpdate.previousStatus;
            response.newStatus = statusUpdate.newStatus;
            response.notes = statusUpdate.notes;
            response.updatedAt = statusUpdate.updatedAt;

            return response;
        }

        // Get Status Updates By Issue Id
        public List<StatusUpdateResponseDto> GetByIssueId(int issueId)
        {
            List<StatusUpdate> updates = statusUpdateRepo.GetByIssueId(issueId);

            List<StatusUpdateResponseDto> response = new List<StatusUpdateResponseDto>();

            foreach (StatusUpdate update in updates)
            {
                StatusUpdateResponseDto dto = new StatusUpdateResponseDto();

                dto.statusUpdateId = update.statusUpdateId;
                dto.issueId = update.issueId;
                dto.updatedById = update.updatedById;
                dto.previousStatus = update.previousStatus;
                dto.newStatus = update.newStatus;
                dto.notes = update.notes;
                dto.updatedAt = update.updatedAt;

                response.Add(dto);
            }

            return response;
        }

        // Delete Status Update
        public bool Delete(int id)
        {
            StatusUpdate? statusUpdate = statusUpdateRepo.GetById(id);

            if (statusUpdate == null)
                return false;

            statusUpdateRepo.Delete(statusUpdate);

            return true;
        }
    }
}

