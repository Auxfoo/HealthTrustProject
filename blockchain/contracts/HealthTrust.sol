// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract HealthTrust is Ownable {
    struct Record {
        uint256 id;
        string cid;
        address uploadedBy;
        uint256 timestamp;
    }

    struct Institution {
        uint256 id;
        string name;
        string institutionType;
        address adminWallet;
        bool isVerified;
    }

    mapping(address => Record[]) private patientRecords;
    mapping(uint256 => Record) private recordsById;
    mapping(uint256 => address) private recordOwners;

    mapping(uint256 => mapping(address => bool)) private doctorAccess;
    mapping(uint256 => mapping(uint256 => bool)) private institutionAccess;
    mapping(uint256 => mapping(address => bool)) private institutionDoctors;
    mapping(uint256 => Institution) private institutions;
    mapping(uint256 => address[]) private institutionDoctorList;

    uint256[] private allRecordIds;
    uint256[] private allInstitutionIds;
    uint256 private nextRecordId = 1;
    uint256 private nextInstitutionId = 1;

    event RecordAdded(address indexed patient, uint256 recordId, string cid, uint256 timestamp);
    event RecordAddedForPatient(address indexed patient, address indexed createdBy, uint256 recordId, string cid, uint256 timestamp);
    event AccessGrantedToDoctor(address indexed patient, address indexed doctor, uint256 recordId);
    event AccessRevokedFromDoctor(address indexed patient, address indexed doctor, uint256 recordId);
    event AccessGrantedToInstitution(address indexed patient, uint256 institutionId, uint256 recordId);
    event AccessRevokedFromInstitution(address indexed patient, uint256 institutionId, uint256 recordId);
    event InstitutionRegistered(uint256 institutionId, string name, address adminWallet);
    event DoctorAddedToInstitution(uint256 institutionId, address doctorAddress);
    event DoctorRemovedFromInstitution(uint256 institutionId, address doctorAddress);

    modifier onlyRecordOwner(uint256 recordId) {
        require(recordOwners[recordId] == msg.sender, "Only record owner can perform this action");
        _;
    }

    modifier onlyInstitutionAdmin(uint256 institutionId) {
        require(institutions[institutionId].adminWallet == msg.sender, "Only institution admin can perform this action");
        _;
    }

    function addRecord(string memory cid) external {
        _addRecordFor(msg.sender, cid, msg.sender);
    }

    function addRecordForPatient(address patient, string memory cid) external {
        require(patient != address(0), "Patient wallet is required");
        _addRecordFor(patient, cid, msg.sender);
    }

    function _addRecordFor(address patient, string memory cid, address createdBy) internal {
        require(bytes(cid).length > 0, "CID is required");

        uint256 recordId = nextRecordId++;
        Record memory newRecord = Record({
            id: recordId,
            cid: cid,
            uploadedBy: patient,
            timestamp: block.timestamp
        });

        patientRecords[patient].push(newRecord);
        recordsById[recordId] = newRecord;
        recordOwners[recordId] = patient;
        allRecordIds.push(recordId);

        emit RecordAdded(patient, recordId, cid, block.timestamp);
        if (createdBy != patient) {
            emit RecordAddedForPatient(patient, createdBy, recordId, cid, block.timestamp);
        }
    }

    function grantAccessToDoctor(uint256 recordId, address doctorAddress) external onlyRecordOwner(recordId) {
        require(doctorAddress != address(0), "Doctor wallet is required");
        doctorAccess[recordId][doctorAddress] = true;
        emit AccessGrantedToDoctor(msg.sender, doctorAddress, recordId);
    }

    function revokeAccessFromDoctor(uint256 recordId, address doctorAddress) external onlyRecordOwner(recordId) {
        require(doctorAddress != address(0), "Doctor wallet is required");
        doctorAccess[recordId][doctorAddress] = false;
        emit AccessRevokedFromDoctor(msg.sender, doctorAddress, recordId);
    }

    function grantAccessToInstitution(uint256 recordId, uint256 institutionId) external onlyRecordOwner(recordId) {
        require(institutions[institutionId].isVerified, "Institution does not exist");
        institutionAccess[recordId][institutionId] = true;
        emit AccessGrantedToInstitution(msg.sender, institutionId, recordId);
    }

    function revokeAccessFromInstitution(uint256 recordId, uint256 institutionId) external onlyRecordOwner(recordId) {
        require(institutions[institutionId].isVerified, "Institution does not exist");
        institutionAccess[recordId][institutionId] = false;
        emit AccessRevokedFromInstitution(msg.sender, institutionId, recordId);
    }

    function registerInstitution(string memory name, string memory institutionType) external {
        require(bytes(name).length > 0, "Institution name is required");
        require(bytes(institutionType).length > 0, "Institution type is required");

        uint256 institutionId = nextInstitutionId++;
        institutions[institutionId] = Institution({
            id: institutionId,
            name: name,
            institutionType: institutionType,
            adminWallet: msg.sender,
            isVerified: true
        });
        allInstitutionIds.push(institutionId);

        emit InstitutionRegistered(institutionId, name, msg.sender);
    }

    function addDoctorToInstitution(
        uint256 institutionId,
        address doctorAddress
    ) external onlyInstitutionAdmin(institutionId) {
        require(doctorAddress != address(0), "Doctor wallet is required");

        if (!institutionDoctors[institutionId][doctorAddress]) {
            institutionDoctors[institutionId][doctorAddress] = true;
            institutionDoctorList[institutionId].push(doctorAddress);
            emit DoctorAddedToInstitution(institutionId, doctorAddress);
        }
    }

    function removeDoctorFromInstitution(
        uint256 institutionId,
        address doctorAddress
    ) external onlyInstitutionAdmin(institutionId) {
        require(doctorAddress != address(0), "Doctor wallet is required");
        require(institutionDoctors[institutionId][doctorAddress], "Doctor is not in institution");

        institutionDoctors[institutionId][doctorAddress] = false;
        address[] storage doctors = institutionDoctorList[institutionId];
        for (uint256 i = 0; i < doctors.length; i++) {
            if (doctors[i] == doctorAddress) {
                doctors[i] = doctors[doctors.length - 1];
                doctors.pop();
                break;
            }
        }

        emit DoctorRemovedFromInstitution(institutionId, doctorAddress);
    }

    function hasAccess(uint256 recordId, address doctorAddress) external view returns (bool) {
        if (doctorAccess[recordId][doctorAddress]) {
            return true;
        }

        for (uint256 i = 0; i < allInstitutionIds.length; i++) {
            uint256 institutionId = allInstitutionIds[i];
            if (institutionAccess[recordId][institutionId] && institutionDoctors[institutionId][doctorAddress]) {
                return true;
            }
        }

        return false;
    }

    function getMyRecords() external view returns (Record[] memory) {
        return patientRecords[msg.sender];
    }

    function getAllRecords() external view returns (Record[] memory) {
        Record[] memory result = new Record[](allRecordIds.length);
        for (uint256 i = 0; i < allRecordIds.length; i++) {
            result[i] = recordsById[allRecordIds[i]];
        }
        return result;
    }

    function getInstitutionDoctors(uint256 institutionId) external view returns (address[] memory) {
        return institutionDoctorList[institutionId];
    }

    function getAllInstitutions() external view returns (Institution[] memory) {
        Institution[] memory result = new Institution[](allInstitutionIds.length);
        for (uint256 i = 0; i < allInstitutionIds.length; i++) {
            result[i] = institutions[allInstitutionIds[i]];
        }
        return result;
    }
}
