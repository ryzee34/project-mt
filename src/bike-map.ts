import type { Ring } from './parts'

export interface PartRule {
  label: string
  ring: Ring
  match: RegExp
  parent?: RegExp
}

export const BIKE_PARTS: PartRule[] = [
  { label: 'Drive chain', ring: 3, match: /link|dupli/ },
  { label: 'Rear sprocket', ring: 3, match: /rear sprocket|sprocket nuts|sprocket studs/ },
  { label: 'Sprocket cover', ring: 1, match: /sprocket cover/ },
  { label: 'Front sprocket', ring: 1, match: /^sprocket$|countershaft/ },

  { label: 'Rear brake disc', ring: 3, match: /rear rotor/ },
  { label: 'Rear wheel', ring: 3, match: /rear tire|rear wheel geometry|rear wheel spacer|rear axle|rear abs ring|rear abs sensor ring/ },
  { label: 'Rear caliper', ring: 3, match: /rear caliper|rear brake pads|caliper pin|hall sensor|rear abs (sensor|cable|bolts)/ },
  { label: 'Front brake discs', ring: 3, match: /rotor|floating ring/ },
  { label: 'Front calipers', ring: 3, match: /front caliper|front brake pads|front pad springs|bleed nipple|front brake line/ },
  { label: 'Front wheel', ring: 3, match: /front tire|front rim|front axle|front spacer|abs sensor|abs ring|abs cable strap/ },
  { label: 'Front forks', ring: 3, match: /fork|lower recievers|adjustment screw/ },
  { label: 'Triple clamps', ring: 3, match: /^head stem$|triple clamp|head nut|head bearings/ },

  { label: 'Suspension linkage', ring: 2, match: /linkage/ },
  { label: 'Rear shock', ring: 2, match: /shock|bumper|piston chrome/ },
  { label: 'Swingarm', ring: 2, match: /swingar|chain tensioner|wheel adjusters/ },
  { label: 'Rearsets and pedals', ring: 2, match: /rearset|^pegs$|rear brake pedal|rear master cylinder|rear brake fluid|rear fluid|quick ?shift|shift actuator|shifter|rear brake lines/ },
  { label: 'Passenger pegs', ring: 2, match: /passenger|pillian/ },
  { label: 'Kickstand', ring: 2, match: /kickstand/ },
  { label: 'ABS unit', ring: 2, match: /abs block/ },
  { label: 'Battery box', ring: 2, match: /battery|rectifier|regulator/ },
  { label: 'Subframe', ring: 2, match: /^subframe( bolts)?$/ },
  { label: 'Frame', ring: 2, match: /^frame|engine mount/ },

  { label: 'Headlight', ring: 4, match: /head ?light|projector|led strips/ },
  { label: 'Instruments', ring: 4, match: /instrument|ignition switch/ },
  { label: 'Handlebars', ring: 4, match: /handlebar|^grips$|bar end|bar clamps|bars bolts/ },
  { label: 'Front turn signals', ring: 4, match: /turn signal/, parent: /head stem/ },
  { label: 'Switches and levers', ring: 4, match: /controls|switch|button|hazard|ride mode|lever|reach adjuster|master cylinder|clutch pivot|brake screw|throttle cables/, parent: /head stem/ },
  { label: 'Tail light', ring: 4, match: /tail light/ },
  { label: 'Rear turn signals', ring: 4, match: /turn signal|signal wires/ },
  { label: 'License plate', ring: 4, match: /license plate|plate bracket/ },
  { label: 'Tail section', ring: 4, match: /tail plastics|subframe cover|undertail/ },
  { label: 'Seat', ring: 4, match: /^seat$/ },
  { label: 'Tank covers', ring: 4, match: /tank sides|tank front trim|tank dressing|scoop/ },
  { label: 'Fuel tank', ring: 4, match: /fuel tank|fuel cap/ },
  { label: 'Rear hugger', ring: 4, match: /hugger/ },
  { label: 'Front fender', ring: 4, match: /front fender/ },

  { label: 'Radiator', ring: 1, match: /raditator|radiator|coolant|overflow/ },
  { label: 'Exhaust', ring: 1, match: /header|exhaust|o sensor/ },
  { label: 'Throttle bodies', ring: 1, match: /throttle|butterfl|fuel rail|tps|vacuum|coupling|upper clamps|lower clamps|rubber couplers/ },
  { label: 'Airbox', ring: 1, match: /airbox/ },
  { label: 'ECU and wiring', ring: 1, match: /ecu|harness/ },
  { label: 'Starter motor', ring: 1, match: /starter/ },
  { label: 'Water pump', ring: 1, match: /water pump|thermostat|jacket/ },
  { label: 'Oil filter and cooler', ring: 1, match: /oil filter|oil cooler/ },

  { label: 'Crankcase', ring: 0, match: /crank case|oil pan|drain plug|oil window|shift spindle|breather/ },
  { label: 'Cylinder block', ring: 0, match: /^cylinders?$|cylinder gasket|cylinder bolts|cam chain tensioner|^cct/ },
  { label: 'Valve cover', ring: 0, match: /valve cover|coilpacks|oil cap/ },
  { label: 'Clutch cover', ring: 0, match: /clutch cover|clutch spring|clutch actuator/ },
  { label: 'Stator cover', ring: 0, match: /stator cover/ },
  { label: 'Timing cover', ring: 0, match: /timing cover/ },
]
