'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useAuth from '../../../../hooks/useAuth';
import useToast from '../../../../hooks/useToast';
import { projectApi, taskApi } from '../../../../services/api';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Modal from '../../../../components/ui/Modal';
import { ToastContainer } from '../../../../components/ui/Toast';
import styles from './page.module.css';

const STATUS_COLORS = {
  todo: 'planning', in_progress: 'active', in_review: 'completed', done: 'completed', cancelled: 'on_hold'
};

const PRIORITY_LABELS = { low: 'Low', medium: 'Med', high: 'High', critical: 'Crit' };

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { currentUser, isLoading } = useAuth();
  const { toasts, toast, removeToast } = useToast();
  const router = useRouter();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium' });
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (!isLoading && !currentUser) router.replace('/');
  }, [currentUser, isLoading, router]);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        projectApi.getById(id),
        taskApi.list(id, statusFilter ? { status: statusFilter } : {}),
      ]);
      setProject(projRes.data.data.project);
      setTasks(taskRes.data.data.tasks);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load project.');
      if (err.response?.status === 403 || err.response?.status === 404) {
        router.push('/projects');
      }
    } finally {
      setIsFetching(false);
    }
  }, [id, statusFilter]);

  useEffect(() => {
    if (currentUser) fetchData();
  }, [currentUser, fetchData]);

  const handleTaskChange = (e) => {
    setTaskForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setIsCreatingTask(true);
    try {
      const { data } = await taskApi.create(id, taskForm);
      setTasks((prev) => [data.data.task, ...prev]);
      toast.success('Task created!');
      setIsTaskModalOpen(false);
      setTaskForm({ title: '', description: '', priority: 'medium' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task.');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      const { data } = await taskApi.transitionStatus(id, taskId, newStatus);
      setTasks((prev) => prev.map((t) => t._id === taskId ? data.data.task : t));
      toast.success(`Task moved to "${newStatus}"`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot make that transition.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await taskApi.delete(id, taskId);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      toast.success('Task deleted.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task.');
    }
  };

  const NEXT_TASK_STATUS = {
    todo: 'in_progress', in_progress: 'in_review', in_review: 'done', done: null, cancelled: 'todo'
  };

  if (isLoading || isFetching) {
    return (
      <main className={styles.page}>
        <div className="container">
          <div className={`skeleton ${styles.skeletonHeader}`} />
          <div className={styles.skeletonTasks}>
            {[1, 2, 3].map((i) => <div key={i} className={`skeleton ${styles.skeletonTask}`} />)}
          </div>
        </div>
      </main>
    );
  }

  if (!project) return null;

  const isOwner = project.owner?._id === currentUser?._id || project.owner === currentUser?._id;

  return (
    <main className={styles.page}>
      <div className="container">

        {/* ── Project Header ─────────────────────────────────────────────── */}
        <div className={styles.projectHeader}>
          <div className={styles.headerLeft}>
            <button onClick={() => router.push('/projects')} className={styles.backLink}>← Projects</button>
            <h1 className={styles.projectName}>{project.name}</h1>
            {project.description && <p className={styles.projectDesc}>{project.description}</p>}
            <div className={styles.projectMeta}>
              <span className={`badge badge--${project.status}`}>{project.status.replace('_', ' ')}</span>
              {project.tags?.map((tag) => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        {/* ── Members ───────────────────────────────────────────────────── */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Members ({project.members?.length})</h2>
          <div className={styles.members}>
            {project.members?.map((m) => (
              <div key={m.user?._id || m.user} className={styles.memberChip}>
                <div className={styles.memberAvatar}>
                  {(m.user?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <span className={styles.memberName}>{m.user?.name || 'Unknown'}</span>
                <span className={`badge badge--${m.role === 'owner' ? 'completed' : 'active'} mono`}>{m.role}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.divider} />

        {/* ── Tasks ─────────────────────────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.taskHeader}>
            <h2 className={styles.sectionTitle}>Tasks ({tasks.length})</h2>
            <div className={styles.taskActions}>
              <select
                className={`form-input ${styles.filterSelect}`}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                id="task-status-filter"
              >
                <option value="">All statuses</option>
                {['todo', 'in_progress', 'in_review', 'done', 'cancelled'].map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
              <Button size="sm" onClick={() => setIsTaskModalOpen(true)} id="create-task-btn">
                + Task
              </Button>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className={styles.emptyTasks}>
              <p>No tasks yet. Create one to start tracking work.</p>
            </div>
          ) : (
            <div className={styles.taskList}>
              {tasks.map((task) => (
                <div key={task._id} className={styles.taskCard}>
                  <div className={styles.taskTop}>
                    <span className={`badge badge--${task.status}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    <span className={`badge badge--${task.priority}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  </div>
                  <div className={styles.taskTitle}>{task.title}</div>
                  {task.description && (
                    <p className={styles.taskDesc}>{task.description}</p>
                  )}
                  <div className={styles.taskFooter}>
                    <div className={styles.taskAssignee}>
                      {task.assignee ? (
                        <>
                          <div className={styles.miniAvatar}>
                            {task.assignee.name.charAt(0)}
                          </div>
                          <span>{task.assignee.name}</span>
                        </>
                      ) : (
                        <span className={styles.unassigned}>Unassigned</span>
                      )}
                    </div>
                    <div className={styles.taskBtns}>
                      {NEXT_TASK_STATUS[task.status] && (
                        <button
                          className={styles.progressBtn}
                          onClick={() => handleTaskStatusChange(task._id, NEXT_TASK_STATUS[task.status])}
                          title={`Move to ${NEXT_TASK_STATUS[task.status]}`}
                        >
                          → {NEXT_TASK_STATUS[task.status].replace('_', ' ')}
                        </button>
                      )}
                      {(isOwner || currentUser?.role === 'admin') && (
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteTask(task._id)}
                          aria-label="Delete task"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Create Task Modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="New task"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsTaskModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="create-task-form" isLoading={isCreatingTask} id="submit-task-btn">
              Create task
            </Button>
          </>
        }
      >
        <form id="create-task-form" onSubmit={handleCreateTask}>
          <div className={styles.formStack}>
            <Input
              id="task-title"
              name="title"
              label="Title *"
              placeholder="e.g. Set up CI/CD pipeline"
              value={taskForm.title}
              onChange={handleTaskChange}
              autoFocus
            />
            <div className="form-group">
              <label htmlFor="task-desc" className="form-label">Description</label>
              <textarea
                id="task-desc"
                name="description"
                className={`form-input ${styles.textarea}`}
                placeholder="What needs to be done?"
                value={taskForm.description}
                onChange={handleTaskChange}
                rows={3}
              />
            </div>
            <div className="form-group">
              <label htmlFor="task-priority" className="form-label">Priority</label>
              <select
                id="task-priority"
                name="priority"
                className="form-input"
                value={taskForm.priority}
                onChange={handleTaskChange}
              >
                {['low', 'medium', 'high', 'critical'].map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </main>
  );
}
