'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useAuth from '../../../hooks/useAuth.js';
import useToast from '../../../hooks/useToast.js';
import { projectApi, taskApi } from '../../../services/api.js';
import Button from '../../../components/ui/Button.js';
import Input from '../../../components/ui/Input.js';
import Modal from '../../../components/ui/Modal.js';
import { ToastContainer } from '../../../components/ui/Toast.js';
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
  const [editingTaskId, setEditingTaskId] = useState(null);

  const [projectForm, setProjectForm] = useState({ name: '', description: '', tags: '' });
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

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

  const handleProjectChange = (e) => {
    setProjectForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setIsUpdatingProject(true);
    try {
      const payload = {
        name: projectForm.name.trim(),
        description: projectForm.description.trim(),
        tags: typeof projectForm.tags === 'string' ? projectForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : projectForm.tags,
      };
      const { data } = await projectApi.update(id, payload);
      setProject(data.data.project);
      toast.success('Project updated!');
      setIsProjectModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update project.');
    } finally {
      setIsUpdatingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    setIsDeletingProject(true);
    try {
      await projectApi.delete(id);
      toast.success('Project deleted.');
      router.push('/projects');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete project.');
    } finally {
      setIsDeletingProject(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;
    setIsAddingMember(true);
    try {
      const { data } = await projectApi.addMember(id, { email: memberEmail.trim(), role: 'viewer' });
      setProject(data.data.project);
      toast.success('Member added!');
      setMemberEmail('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member.');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await projectApi.removeMember(id, userId);
      setProject((prev) => ({ ...prev, members: prev.members.filter(m => m.user?._id !== userId && m.user !== userId) }));
      toast.success('Member removed.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  const handleTaskChange = (e) => {
    setTaskForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    setIsCreatingTask(true);
    try {
      if (editingTaskId) {
        const { data } = await taskApi.update(id, editingTaskId, taskForm);
        setTasks((prev) => prev.map((t) => t._id === editingTaskId ? data.data.task : t));
        toast.success('Task updated!');
      } else {
        const { data } = await taskApi.create(id, taskForm);
        setTasks((prev) => [data.data.task, ...prev]);
        toast.success('Task created!');
      }
      setIsTaskModalOpen(false);
      setTaskForm({ title: '', description: '', priority: 'medium' });
      setEditingTaskId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${editingTaskId ? 'update' : 'create'} task.`);
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
          {isOwner && (
            <div className={styles.headerButtons}>
              <Button size="sm" variant="ghost" onClick={() => {
                setProjectForm({ name: project.name, description: project.description || '', tags: project.tags?.join(', ') || '' });
                setIsProjectModalOpen(true);
              }}>
                Edit Project
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={styles.deleteProjectBtn}
                onClick={handleDeleteProject}
                isLoading={isDeletingProject}
              >
                Delete Project
              </Button>
            </div>
          )}
        </div>

        <div className={styles.divider} />

        {/* ── Members ───────────────────────────────────────────────────── */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Members ({project.members?.length || 0})</h2>
          <div className={styles.members}>
            {project.members?.length > 0 ? project.members.map((m) => {
              const uId = m.user?._id || m.user;
              const memberName = m.user?.name || m.user?.email || (typeof m.user === 'string' ? m.user : 'Unknown');
              return (
              <div key={uId} className={styles.memberChip}>
                <div className={styles.memberAvatar}>
                  {memberName.charAt(0).toUpperCase()}
                </div>
                <span className={styles.memberName}>{memberName}</span>
                <span className={`badge badge--${m.role === 'owner' ? 'completed' : 'active'} mono`}>{m.role}</span>
                {isOwner && m.role !== 'owner' && (
                  <button className={styles.deleteBtn} onClick={() => handleRemoveMember(uId)} aria-label="Remove member">✕</button>
                )}
              </div>
            )}) : (
              <div className={styles.emptyMembers}>No members added yet.</div>
            )}
          </div>
          {isOwner && (
            <form onSubmit={handleAddMember} className={styles.memberForm}>
              <div className={styles.memberInputWrapper}>
                <Input
                  id="add-member-email"
                  name="email"
                  placeholder="User email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  type="email"
                  required
                />
              </div>
              <Button type="submit" isLoading={isAddingMember} size="md">Add Member</Button>
            </form>
          )}
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
              <Button size="sm" onClick={() => { setEditingTaskId(null); setTaskForm({ title: '', description: '', priority: 'medium' }); setIsTaskModalOpen(true); }} id="create-task-btn">
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
                        <>
                          <button
                            className={styles.editBtn}
                            onClick={() => {
                              setEditingTaskId(task._id);
                              setTaskForm({ title: task.title, description: task.description || '', priority: task.priority });
                              setIsTaskModalOpen(true);
                            }}
                            aria-label="Edit task"
                          >
                            ✎
                          </button>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDeleteTask(task._id)}
                            aria-label="Delete task"
                          >
                            ✕
                          </button>
                        </>
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
        title={editingTaskId ? "Edit task" : "New task"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsTaskModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="create-task-form" isLoading={isCreatingTask} id="submit-task-btn">
              {editingTaskId ? "Save changes" : "Create task"}
            </Button>
          </>
        }
      >
        <form id="create-task-form" onSubmit={handleSubmitTask}>
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

      {/* ── Edit Project Modal ───────────────────────────────────────────── */}
      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title="Edit project"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsProjectModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="edit-project-form" isLoading={isUpdatingProject}>
              Save changes
            </Button>
          </>
        }
      >
        <form id="edit-project-form" onSubmit={handleUpdateProject}>
          <div className={styles.formStack}>
            <Input
              id="proj-name"
              name="name"
              label="Project name *"
              value={projectForm.name}
              onChange={handleProjectChange}
              required
            />
            <div className="form-group">
              <label htmlFor="proj-desc" className="form-label">Description</label>
              <textarea
                id="proj-desc"
                name="description"
                className={`form-input ${styles.textarea}`}
                value={projectForm.description}
                onChange={handleProjectChange}
                rows={3}
              />
            </div>
            <Input
              id="proj-tags"
              name="tags"
              label="Tags (comma-separated)"
              value={projectForm.tags}
              onChange={handleProjectChange}
            />
          </div>
        </form>
      </Modal>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </main>
  );
}
