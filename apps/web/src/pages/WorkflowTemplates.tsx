import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookTemplate,
  Star,
  BarChart3,
  Users,
  Zap,
  ArrowRight,
  Loader2,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { useWorkflowTemplates, useCreateFromTemplate, useSeedTemplates } from '../api/workflows';
import { LoadingSpinner } from '../components/LoadingSpinner';

const CATEGORY_META: Record<string, { label: string; icon: typeof Zap; color: string }> = {
  'lead-management': { label: 'Lead Management', icon: Users, color: 'bg-blue-100 text-blue-700' },
  engagement: { label: 'Engagement', icon: Zap, color: 'bg-green-100 text-green-700' },
  'campaign-monitoring': { label: 'Campaign Monitoring', icon: BarChart3, color: 'bg-purple-100 text-purple-700' },
};

export function WorkflowTemplates() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');

  const { data: templates, isLoading, refetch } = useWorkflowTemplates(
    selectedCategory || undefined
  );
  const createFromTemplate = useCreateFromTemplate();
  const seedTemplates = useSeedTemplates();

  const handleSeed = async () => {
    try {
      await seedTemplates.mutateAsync(undefined);
      refetch();
    } catch (error) {
      console.error('Failed to seed templates:', error);
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      const result = await createFromTemplate.mutateAsync({
        templateId,
        name: customName || undefined,
      });
      navigate(`/workflows/${result.id}`);
    } catch (error) {
      console.error('Failed to create from template:', error);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const categories = ['', ...Object.keys(CATEGORY_META)];
  const isEmpty = !templates || templates.length === 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <Sparkles className="text-indigo-500" size={24} />
            Workflow Templates
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Start with a pre-built workflow and customize it to your needs
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-8">
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat];
          const label = meta?.label || 'All Templates';
          return (
            <button
              key={cat || 'all'}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {isEmpty ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <BookTemplate size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates available</h3>
          <p className="text-gray-500 mb-6">
            Seed the default templates to get started with pre-built workflows
          </p>
          <button
            onClick={handleSeed}
            disabled={seedTemplates.isPending}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            {seedTemplates.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            Seed Default Templates
          </button>
        </div>
      ) : (
        /* Template Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const catMeta = CATEGORY_META[template.category];
            const isExpanded = expandedTemplate === template.id;
            const definition = template.workflowDefinition as any;
            const steps = definition?.steps || [];

            return (
              <div
                key={template.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  {/* Category + Featured */}
                  <div className="flex items-center gap-2 mb-3">
                    {catMeta && (
                      <span className={`text-xs font-medium px-2 py-1 rounded-md ${catMeta.color}`}>
                        {catMeta.label}
                      </span>
                    )}
                    {template.isFeatured && (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                        <Star size={12} /> Featured
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {template.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    <span>{steps.length} steps</span>
                    <span>{template.usageCount || 0} uses</span>
                  </div>

                  {/* Expand Steps */}
                  <button
                    onClick={() => setExpandedTemplate(isExpanded ? null : template.id)}
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 mb-4"
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                    {isExpanded ? 'Hide' : 'Preview'} steps
                  </button>

                  {isExpanded && steps.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {steps.map((step: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2"
                        >
                          <span className="text-xs font-bold text-gray-400 w-5">{idx + 1}</span>
                          <span className="font-medium text-gray-700">{step.actionType}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Custom Name + Use Button */}
                  {isExpanded && (
                    <div className="mb-4">
                      <input
                        type="text"
                        value={expandedTemplate === template.id ? customName : ''}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder={`Custom name (default: ${template.name})`}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg mb-3"
                      />
                    </div>
                  )}

                  <button
                    onClick={() => handleUseTemplate(template.id)}
                    disabled={createFromTemplate.isPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {createFromTemplate.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        Use Template <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
