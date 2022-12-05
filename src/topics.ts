export default {
    newTransaction: `master/new_transaction`,
    taskCompleted: (workerId, taskId) => `worker/done/${workerId}/${taskId}`,
    keepAlive: id => `worker/keepalive/${id}`,
    newTask: id => `worker/new_task/${id}`,
}