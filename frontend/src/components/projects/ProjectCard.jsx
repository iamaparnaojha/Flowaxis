'use client';

import Link from 'next/link';
import styles from './ProjectCard.module.css';

const STATUS_LABELS = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
};

const ProjectCard = ({ project }) => {
  const memberCount = project.members?.length ?? 0;
  const formattedDate = project.dueDate
    ? new Date(project.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <Link href={`/projects/${project._id}`} className={styles.card}>
      <div className={styles.top}>
        <div className={styles.name}>{project.name}</div>
        <span className={`badge badge--${project.status}`}>
          {STATUS_LABELS[project.status]}
        </span>
      </div>

      {project.description && (
        <p className={styles.description}>{project.description}</p>
      )}

      {project.tags?.length > 0 && (
        <div className={styles.tags}>
          {project.tags.slice(0, 4).map((tag) => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <div className={styles.members}>
          <span className={styles.memberIcon}>◎</span>
          <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
        </div>
        {formattedDate && (
          <span className={styles.due}>Due {formattedDate}</span>
        )}
      </div>
    </Link>
  );
};

export default ProjectCard;
