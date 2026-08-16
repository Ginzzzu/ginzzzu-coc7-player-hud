const requests = new Map();
let statusSender = null;

export class PendingRequestService {
  static configure({sendStatus} = {}) {
    statusSender = typeof sendStatus === "function" ? sendStatus : null;
  }

  static receive(request) {
    if (!request?.requestId) return false;
    requests.set(request.requestId, structuredClone(request));
    return true;
  }

  static cancel(requestId) {
    return requests.delete(requestId);
  }

  static complete(requestId) {
    return requests.delete(requestId);
  }

  static list() {
    return [...requests.values()].sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0));
  }

  static count() {
    return requests.size;
  }

  static async status(requestId, status) {
    const request = requests.get(requestId);
    if (!request || !statusSender) return;
    await statusSender(request, status);
  }
}
