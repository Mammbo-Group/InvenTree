# Generated by Django 3.0.7 on 2020-11-10 11:25

from django.db import migrations

from moneyed import CURRENCIES
from django.db import migrations, connection
from company.models import SupplierPriceBreak


def migrate_currencies(apps, schema_editor):
    """
    Migrate from the 'old' method of handling currencies,
    to the new method which uses the django-money library.

    Previously, we created a custom Currency model,
    which was very simplistic.

    Here we will attempt to map each existing "currency" reference
    for the SupplierPriceBreak model, to a new django-money compatible currency.
    """

    print("Updating currency references for SupplierPriceBreak model...")

    # A list of available currency codes
    currency_codes = CURRENCIES.keys()

    cursor = connection.cursor()

    # The 'suffix' field denotes the currency code
    response = cursor.execute('SELECT id, suffix, description from common_currency;')
    
    results = cursor.fetchall()

    remap = {}

    for index, row in enumerate(results):
        pk, suffix, description = row

        suffix = suffix.strip().upper()

        if suffix not in currency_codes:
            print("Missing suffix:", suffix)

            while suffix not in currency_codes:
                # Ask the user to input a valid currency
                print(f"Could not find a valid currency matching '{suffix}'.")
                print("Please enter a valid currency code")
                suffix = str(input("> ")).strip()

        if pk not in remap.keys():
            remap[pk] = suffix

    # Now iterate through each PartSellPriceBreak and update the rows
    response = cursor.execute('SELECT id, cost, currency_id, price, price_currency from part_partsellpricebreak;')
    
    results = cursor.fetchall()

    count = 0

    for index, row in enumerate(results):
        pk, cost, currency_id, price, price_currency = row

        # Copy the 'cost' field across to the 'price' field
        response = cursor.execute(f'UPDATE part_partsellpricebreak set price={cost} where id={pk};')

        # Extract the updated currency code
        currency_code = remap.get(currency_id, 'USD')

        # Update the currency code
        response = cursor.execute(f"UPDATE part_partsellpricebreak set price_currency='{currency_code}' where id={pk};")

        count += 1

    print(f"Updated {count} SupplierPriceBreak rows")

def reverse_currencies(apps, schema_editor):
    """
    Reverse the "update" process.

    Here we may be in the situation that the legacy "Currency" table is empty,
    and so we have to re-populate it based on the new price_currency codes.
    """

    print("Reversing currency migration...")

    cursor = connection.cursor()

    # Extract a list of currency codes which are in use
    response = cursor.execute(f'SELECT id, price, price_currency from part_partsellpricebreak;')
    
    results = cursor.fetchall()

    codes_in_use = set()

    for index, row in enumerate(results):
        pk, price, code = row

        codes_in_use.add(code)

        # Copy the 'price' field back into the 'cost' field
        response = cursor.execute(f'UPDATE part_partsellpricebreak set cost={price} where id={pk};')

    # Keep a dict of which currency objects map to which code
    code_map = {}

    # For each currency code in use, check if we have a matching Currency object
    for code in codes_in_use:
        response = cursor.execute(f"SELECT id, suffix from common_currency where suffix='{code}';")
        row = response.fetchone()

        if row is not None:
            # A match exists!
            pk, suffix = row
            code_map[suffix] = pk
        else:
            # No currency object exists!
            description = CURRENCIES[code]

            # Create a new object in the database
            print(f"Creating new Currency object for {code}")
        
            # Construct a query to create a new Currency object
            query = f"INSERT into common_currency (symbol, suffix, description, value, base) VALUES ('$', '{code}', '{description}', 1.0, False);"

            response = cursor.execute(query)

            code_map[code] = cursor.lastrowid

    # Ok, now we know how each suffix maps to a Currency object
    for suffix in code_map.keys():
        pk = code_map[suffix]

        # Update the table to point to the Currency objects
        print(f"Currency {suffix} -> pk {pk}")

        response = cursor.execute(f"UPDATE part_partsellpricebreak set currency_id={pk} where price_currency='{suffix}';")


class Migration(migrations.Migration):

    dependencies = [
        ('part', '0055_auto_20201110_1001'),
    ]

    operations = [
        migrations.RunPython(migrate_currencies, reverse_code=reverse_currencies),
    ]
