public with sharing class AccountChartController {
    @AuraEnabled(cacheable=true)
    public static List<AggregateResult> getAccountsByMonth() {
        return [
            SELECT CALENDAR_MONTH(CreatedDate), COUNT(Id)
            FROM Account
            WHERE CreatedDate = LAST_N_MONTHS:12
            GROUP BY CALENDAR_MONTH(CreatedDate)
            ORDER BY CALENDAR_MONTH(CreatedDate)
        ];
    }
}