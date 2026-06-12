'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { projectApi } from '../../services/api';
import ProjectCard from '../../components/projects/ProjectCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { ToastContainer } from '../../components/ui/Toast';
import styles from './page.module.css';

export default function ProjectsPage() {
  const { currentUser, isLoading } = useAuth();
  const { toasts, toast, removeToast } = useToast();
  const router = useRouter();

  const [projects, setProjects] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', tags: '' });

  useEffect(() => {
    if (!isLoading && !currentUser) router.replace('/');
  }, [currentUser, isLoading, router]);

  const fetchProjects = useCallback(async () => {
    try {
      const { data } = await projectApi.list();
      setProjects(data.data.projects);
    } catch {
      toast.error('Failed to load projects.');
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) fetchProjects();
  }, [currentUser, fetchProjects]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isCreating) return;
    if (!form.name.trim()) return;
    setIsCreating(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };
      const { data } = await projectApi.create(payload);
      setProjects((prev) => [data.data.project, ...prev]);
      toast.success('Project created!');
      setIsModalOpen(false);
      setForm({ name: '', description: '', tags: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project.');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) return null;

  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Projects</h1>
            <p className={styles.subtitle}>
              {projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} id="create-project-btn">
            + New project
          </Button>
        </div>

        {isFetching ? (
          <div className="grid-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={`skeleton ${styles.skeletonCard}`} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>◫</div>
            <h2>No projects yet</h2>
            <p>Create your first project to get started.</p>
            <Button onClick={() => setIsModalOpen(true)}>Create project</Button>
          </div>
        ) : (
          <div className="grid-3">
            {projects.map((p) => (
              <ProjectCard key={p._id || p.id} project={p} />
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New project"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              form="create-project-form"
              disabled={isCreating}
              id="submit-project-btn"
            >
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </>
        }
      >
        <form id="create-project-form" onSubmit={handleCreate}>
          <div className={styles.formStack}>
            <Input
              id="project-name"
              name="name"
              label="Project name *"
              placeholder="e.g. FlowAxis v2"
              value={form.name}
              onChange={handleChange}
              autoFocus
            />
            <div className="form-group">
              <label htmlFor="project-desc" className="form-label">Description</label>
              <textarea
                id="project-desc"
                name="description"
                className={`form-input ${styles.textarea}`}
                placeholder="What is this project about?"
                value={form.description}
                onChange={handleChange}
                rows={3}
              />
            </div>
            <Input
              id="project-tags"
              name="tags"
              label="Tags (comma-separated)"
              placeholder="design, api, backend"
              value={form.tags}
              onChange={handleChange}
            />
          </div>
        </form>
      </Modal>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </main>
  );
}
