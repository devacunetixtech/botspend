// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract BotSpend {
    struct AgentProfile {
        address wallet;
        string name;
        string description;
        uint256 registeredAt;
        bool isActive;
    }

    struct PaymentRecord {
        address from;
        address to;
        uint256 amount;
        string note;
        uint256 timestamp;
    }

    struct ServiceRequest {
        uint256 id;
        address requester;
        address provider;
        string description;
        uint256 amount;
        bool completed;
        uint256 createdAt;
    }

    AgentProfile[] private agents;
    PaymentRecord[] private payments;
    ServiceRequest[] private requests;
    mapping(address => uint256) private agentIndex;
    mapping(uint256 => address) private requestProvider;
    mapping(address => uint256[]) private requesterRequests;

    event AgentRegistered(address indexed wallet, string name, string description, uint256 registeredAt);
    event PaymentSent(address indexed from, address indexed to, uint256 amount, string note, uint256 timestamp);
    event ServiceRequestCreated(
        uint256 indexed requestId,
        address indexed requester,
        address indexed provider,
        string description,
        uint256 amount,
        uint256 createdAt
    );
    event ServiceRequestCompleted(uint256 indexed requestId, address indexed provider, uint256 timestamp);

    error EmptyName();
    error AlreadyRegistered();
    error AgentNotFound();
    error InvalidAmount();
    error TransferFailed();
    error RequestNotFound();

    function registerAgent(string memory name, string memory description) external {
        if (bytes(name).length == 0) revert EmptyName();
        if (agentIndex[msg.sender] != 0) revert AlreadyRegistered();

        agents.push(
            AgentProfile({
                wallet: msg.sender,
                name: name,
                description: description,
                registeredAt: block.timestamp,
                isActive: true
            })
        );

        agentIndex[msg.sender] = agents.length;
        emit AgentRegistered(msg.sender, name, description, block.timestamp);
    }

    function payAgent(address to, uint256 amount, string memory note) external payable {
        if (amount == 0) revert InvalidAmount();
        if (agentIndex[to] == 0) revert AgentNotFound();
        if (msg.value != amount) revert InvalidAmount();

        (bool success, ) = payable(to).call{value: amount}("");
        if (!success) revert TransferFailed();

        payments.push(
            PaymentRecord({
                from: msg.sender,
                to: to,
                amount: amount,
                note: note,
                timestamp: block.timestamp
            })
        );

        emit PaymentSent(msg.sender, to, amount, note, block.timestamp);
    }

    function createServiceRequest(
        address provider,
        string memory description,
        uint256 amount
    ) external payable returns (uint256) {
        if (agentIndex[provider] == 0) revert AgentNotFound();
        if (amount == 0) revert InvalidAmount();
        if (msg.value != amount) revert InvalidAmount();

        uint256 requestId = requests.length + 1;
        requests.push(
            ServiceRequest({
                id: requestId,
                requester: msg.sender,
                provider: provider,
                description: description,
                amount: amount,
                completed: false,
                createdAt: block.timestamp
            })
        );

        requesterRequests[msg.sender].push(requestId);
        requestProvider[requestId] = provider;

        (bool success, ) = payable(provider).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit ServiceRequestCreated(requestId, msg.sender, provider, description, amount, block.timestamp);
        return requestId;
    }

    function completeServiceRequest(uint256 requestId) external {
        if (requestId == 0 || requestId > requests.length) revert RequestNotFound();

        ServiceRequest storage request = requests[requestId - 1];
        if (request.provider != msg.sender && request.requester != msg.sender) revert RequestNotFound();

        request.completed = true;
        emit ServiceRequestCompleted(requestId, request.provider, block.timestamp);
    }

    function getAgentCount() external view returns (uint256) {
        return agents.length;
    }

    function getAgent(uint256 index) external view returns (AgentProfile memory) {
        if (index >= agents.length) revert AgentNotFound();
        return agents[index];
    }

    function getAgentByWallet(address wallet) external view returns (AgentProfile memory) {
        uint256 index = agentIndex[wallet];
        if (index == 0) revert AgentNotFound();
        return agents[index - 1];
    }

    function getPaymentCount() external view returns (uint256) {
        return payments.length;
    }

    function getPayment(uint256 index) external view returns (PaymentRecord memory) {
        if (index >= payments.length) revert AgentNotFound();
        return payments[index];
    }

    function getRequestCount() external view returns (uint256) {
        return requests.length;
    }

    function getRequest(uint256 requestId) external view returns (ServiceRequest memory) {
        if (requestId == 0 || requestId > requests.length) revert RequestNotFound();
        return requests[requestId - 1];
    }

    function getRequesterRequests(address requester) external view returns (uint256[] memory) {
        return requesterRequests[requester];
    }
}
