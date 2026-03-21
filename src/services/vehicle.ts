import { supabase } from '../lib/supabase';
import type { VehicleDetails } from '../types';

class VehicleService {
    /**
     * Save vehicle details to the user's profile (vehicle_details jsonb column)
     */
    async saveVehicleDetails(
        userId: string,
        vehicleDetails: VehicleDetails,
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ vehicle_details: vehicleDetails, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (error) return { success: false, error: error.message };
            return { success: true };
        } catch {
            return { success: false, error: 'An unexpected error occurred' };
        }
    }

    /**
     * Get saved vehicle details from the user's profile
     */
    async getVehicleDetails(userId: string): Promise<{ success: boolean; vehicleDetails?: VehicleDetails; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('vehicle_details')
                .eq('id', userId)
                .single();

            if (error) return { success: false, error: error.message };
            return { success: true, vehicleDetails: data?.vehicle_details ?? undefined };
        } catch {
            return { success: false, error: 'An unexpected error occurred' };
        }
    }
}

export const vehicleService = new VehicleService();
