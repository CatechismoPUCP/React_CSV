import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PersonInfoSchema } from '../../../types/course';
import styles from './CourseInfoForm.module.css';

const CourseInfoFormSchema = z.object({
  name: z.string().min(1, 'Nome corso richiesto'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido'),
  instructor: PersonInfoSchema,
  coordinator: PersonInfoSchema,
});

type CourseInfoFormData = z.infer<typeof CourseInfoFormSchema>;

interface CourseInfoFormProps {
  initialData?: Partial<CourseInfoFormData>;
  onSubmit: (data: CourseInfoFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const CourseInfoForm: React.FC<CourseInfoFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CourseInfoFormData>({
    resolver: zodResolver(CourseInfoFormSchema),
    defaultValues: initialData,
  });

  const startDate = watch('startDate');

  return (
    <div className={styles.courseInfoForm}>
      <h2>Informazioni Corso</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className={styles.formGrid}>
        {/* Course Basic Info */}
        <div className={styles.formSection}>
          <h3>Dati Corso</h3>
          
          <div className={styles.formGroup}>
            <label htmlFor="name">Nome Corso *</label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className={errors.name ? styles.error : ''}
              placeholder="Es: Corso di Formazione Professionale"
            />
            {errors.name && <span className={styles.errorMessage}>{errors.name.message}</span>}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="startDate">Data Inizio *</label>
              <input
                id="startDate"
                type="date"
                {...register('startDate')}
                className={errors.startDate ? styles.error : ''}
              />
              {errors.startDate && <span className={styles.errorMessage}>{errors.startDate.message}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="endDate">Data Fine *</label>
              <input
                id="endDate"
                type="date"
                {...register('endDate')}
                min={startDate}
                className={errors.endDate ? styles.error : ''}
              />
              {errors.endDate && <span className={styles.errorMessage}>{errors.endDate.message}</span>}
            </div>
          </div>
        </div>

        {/* Instructor Info */}
        <div className={styles.formSection}>
          <h3>Docente</h3>
          
          <div className={styles.formGroup}>
            <label htmlFor="instructor.name">Nome Docente *</label>
            <input
              id="instructor.name"
              type="text"
              {...register('instructor.name')}
              className={errors.instructor?.name ? styles.error : ''}
              placeholder="Nome e cognome del docente"
            />
            {errors.instructor?.name && (
              <span className={styles.errorMessage}>{errors.instructor.name.message}</span>
            )}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="instructor.email">Email Docente *</label>
              <input
                id="instructor.email"
                type="email"
                {...register('instructor.email')}
                className={errors.instructor?.email ? styles.error : ''}
                placeholder="docente@example.com"
              />
              {errors.instructor?.email && (
                <span className={styles.errorMessage}>{errors.instructor.email.message}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="instructor.phone">Telefono Docente</label>
              <input
                id="instructor.phone"
                type="tel"
                {...register('instructor.phone')}
                placeholder="+39 123 456 7890"
              />
            </div>
          </div>
        </div>

        {/* Coordinator Info */}
        <div className={styles.formSection}>
          <h3>Responsabile</h3>
          
          <div className={styles.formGroup}>
            <label htmlFor="coordinator.name">Nome Responsabile *</label>
            <input
              id="coordinator.name"
              type="text"
              {...register('coordinator.name')}
              className={errors.coordinator?.name ? styles.error : ''}
              placeholder="Nome e cognome del responsabile"
            />
            {errors.coordinator?.name && (
              <span className={styles.errorMessage}>{errors.coordinator.name.message}</span>
            )}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="coordinator.email">Email Responsabile *</label>
              <input
                id="coordinator.email"
                type="email"
                {...register('coordinator.email')}
                className={errors.coordinator?.email ? styles.error : ''}
                placeholder="responsabile@example.com"
              />
              {errors.coordinator?.email && (
                <span className={styles.errorMessage}>{errors.coordinator.email.message}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="coordinator.phone">Telefono Responsabile</label>
              <input
                id="coordinator.phone"
                type="tel"
                {...register('coordinator.phone')}
                placeholder="+39 123 456 7890"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className={styles.formActions}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={`${styles.btn} ${styles.btnSecondary}`}
              disabled={isLoading}
            >
              Annulla
            </button>
          )}
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={isLoading}
          >
            {isLoading ? 'Salvataggio...' : 'Continua'}
          </button>
        </div>
      </form>

    </div>
  );
};
