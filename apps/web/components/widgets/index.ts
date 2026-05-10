import GaugeWidget from './GaugeWidget';
import SemiDonutWidget from './SemiDonutWidget';
import ProductionWidget from './ProductionWidget';
import AdvancedInputWidget from './AdvancedInputWidget';
import InputWidget from './InputWidget';
import { DailyExecutiveReport } from './DailyExecutiveReport';
import KanbanCardWidget from './KanbanCardWidget';
import ProcessFlowWidget from './ProcessFlowWidget';
import ProductPerHourWidget from './ProductionPerHourWidget'
export const WidgetLibrary: Record<string, any> = {
  GAUGE: GaugeWidget,
  SEMI_DONUT: SemiDonutWidget,
  DAILY_EXECUTIVE_REPORT: DailyExecutiveReport,
  PRODUCTION: ProductionWidget,
  ADVANCED_INPUT: AdvancedInputWidget,
  INPUT: InputWidget,
  PROCESS_FLOW: ProcessFlowWidget,
  KANBAN: KanbanCardWidget,
  PRODUCTION_PER_HOUR: ProductPerHourWidget,
};